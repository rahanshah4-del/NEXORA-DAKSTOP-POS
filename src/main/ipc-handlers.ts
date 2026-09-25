import { ipcMain, BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import {
  saveStaffProfile, loadStaffProfile, clearStaffProfile,
  saveLoginCredentials, loadLoginCredentials, clearLoginCredentials,
} from '../firebase/token-store';

let mainWindowRef: BrowserWindow | null = null;
// Active Firestore menuItems listener (single subscription, replaced on re-subscribe).
let menuItemsUnsubscribe: (() => void) | null = null;
// Active Firestore workspace-currency listener (single subscription, replaced on re-subscribe).
let workspaceUnsubscribe: (() => void) | null = null;
// Main → renderer auth bridge (single subscription for the app's lifetime).
let authStateUnsubscribe: (() => void) | null = null;
// ipcMain.handle throws on a duplicate channel, and registerIpcHandlers runs
// again on macOS 'activate'. Channels are registered once per process; only
// the window reference and its teardown hook are refreshed per window.
let handlersRegistered = false;

/** Drop the workspace-currency subscription (module scope so window hooks can call it). */
function stopWorkspaceListener(): void {
  workspaceUnsubscribe?.();
  workspaceUnsubscribe = null;
}

/**
 * Push main-process Firebase auth transitions to the renderer.
 *
 * The main process holds the only real Firebase session, so if it drops while
 * the app is running the renderer would otherwise keep an unlocked UI on
 * screen while every cloud call silently fails.
 *
 * Subscribed exactly once: registerIpcHandlers() runs again on macOS
 * 'activate', which reassigns mainWindowRef, so the callback reads that ref
 * lazily instead of capturing a window that may already be destroyed.
 */
function attachAuthStateBridge(): void {
  if (authStateUnsubscribe) return;

  import('../firebase/auth')
    .then(({ onAuthChange }) => {
      authStateUnsubscribe = onAuthChange((user) => {
        // Minimal payload — never a token, email or any other credential.
        const state = { signedIn: user !== null, uid: user?.uid ?? null };
        const win = mainWindowRef;
        if (!win || win.isDestroyed()) return;
        try {
          win.webContents.send(IPC_CHANNELS.AUTH_STATE_CHANGED, state);
        } catch { /* window torn down mid-send — non-critical */ }
      });
    })
    .catch((err) => console.error('[Auth] Failed to attach auth state bridge:', err));
}

// ── Money helpers ──
// The SQLite schema stores monetary amounts in cents (matches sync-drain.ts),
// while order payloads from the renderer carry rupees. These convert both ways.
function toCents(rupees: unknown): number {
  return Math.round((Number(rupees) || 0) * 100);
}
function fromCents(cents: unknown): number {
  return Math.round((Number(cents) || 0)) / 100;
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Always point at the current window — 'activate' creates a new one.
  mainWindowRef = mainWindow;
  attachAuthStateBridge(); // self-guarded: subscribes at most once

  // A closed window can never receive push events, so drop the Firestore
  // subscription with it. Attached per window, not per channel registration.
  mainWindow.on('closed', stopWorkspaceListener);

  if (handlersRegistered) return;
  handlersRegistered = true;

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindowRef?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindowRef?.isMaximized()) {
      mainWindowRef?.unmaximize();
    } else {
      mainWindowRef?.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindowRef?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => {
    return mainWindowRef?.isMaximized() ?? false;
  });

  // ── Renderer → main-process logging bridge ──
  // All renderer console.error / console.warn calls that go through this channel
  // land in the main-process stdout/stderr so they appear in the terminal and
  // are never swallowed by the renderer's isolated console.
  ipcMain.handle(IPC_CHANNELS.APP_LOG, (_e, { level, message, meta }) => {
    const ts = new Date().toISOString();
    const prefix = `[RENDERER-${(level ?? 'info').toUpperCase()}]`;
    const metaStr = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
    const line = `${ts} ${prefix} ${message}${metaStr}`;

    switch (level) {
      case 'error': console.error(line); break;
      case 'warn':  console.warn(line);  break;
      default:      console.log(line);   break;
    }
  });

  // App Info
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, () => {
    return process.platform;
  });

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_FOR_UPDATES, async () => {
    try {
      const { autoUpdater } = await import('electron-updater');
      const result = await autoUpdater.checkForUpdates();
      return {
        updateAvailable: result?.updateInfo?.version !== app.getVersion(),
        version: result?.updateInfo?.version ?? null,
      };
    } catch {
      return { updateAvailable: false, version: null };
    }
  });

  // ── Login credential persistence (remember workspace + staff ID, never PIN) ──
  ipcMain.handle(IPC_CHANNELS.AUTH_SAVE_LOGIN_CREDS, (_e, { workspaceCode, staffLoginId }) => {
    return saveLoginCredentials({ workspaceCode, staffLoginId });
  });
  ipcMain.handle(IPC_CHANNELS.AUTH_LOAD_LOGIN_CREDS, () => {
    return loadLoginCredentials();
  });
  ipcMain.handle(IPC_CHANNELS.AUTH_CLEAR_LOGIN_CREDS, () => {
    clearLoginCredentials();
    return true;
  });

  // Staff PIN verification (no session switch — used for sensitive-action gating)
  ipcMain.handle(IPC_CHANNELS.AUTH_VERIFY_STAFF_PIN, async (_e, { workspaceId, pin }: { workspaceId: string; pin: string }) => {
    try {
      const { verifyStaffPin } = await import('../firebase/auth');
      return await verifyStaffPin(workspaceId, pin);
    } catch (e: any) {
      return { success: false, staff: null, errorCode: 'internal', error: e.message ?? 'Verification failed' };
    }
  });

  // Auth handlers (stubs — firebase auth initialized when needed)
  ipcMain.handle(IPC_CHANNELS.AUTH_SIGN_IN, async (_event, { email, password }) => {
    try {
      const { signInWithEmail, resolveOwnerProfile } = await import('../firebase/auth');
      const user = await signInWithEmail(email, password);

      // After email/password sign-in, resolve the owner's workspace profile.
      // The Firestore rules already allow owners via workspaceOwner() matching uid
      // against the workspace doc's ownerId — no custom claim needed.
      const staffProfile = await resolveOwnerProfile(user.uid);
      if (!staffProfile) {
        // Account authenticated but isn't linked to any workspace.
        // Sign them out so we don't leave a dangling Firebase session.
        try {
          const { signOutUser } = await import('../firebase/auth');
          await signOutUser();
        } catch { /* best-effort */ }
        return {
          success: false,
          error: 'This account isn\'t linked to a restaurant workspace. Please use Staff PIN login or contact the workspace owner.',
        };
      }

      // Persist the staff profile so it survives app restarts
      // (same mechanism as staff PIN login)
      saveStaffProfile({
        workspaceId: staffProfile.workspaceId,
        staffUid: staffProfile.uid,
        staffName: staffProfile.name,
        staffRole: staffProfile.role,
      });

      return { success: true, user, staff: staffProfile };
    } catch (error: any) {
      return { success: false, error: error.message ?? 'Authentication failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_SIGN_OUT, async () => {
    try {
      const { signOutUser } = await import('../firebase/auth');
      await signOutUser();
      clearStaffProfile(); // also clear the persisted staff profile
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message ?? 'Sign out failed' };
    }
  });

  // Load persisted staff profile — used on app startup to restore
  // workspace-scoped data after a Firebase session is confirmed.
  ipcMain.handle(IPC_CHANNELS.AUTH_GET_STAFF_PROFILE, () => {
    return loadStaffProfile();
  });

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_CURRENT_USER, async () => {
    const { getCurrentUser } = await import('../firebase/auth');
    return getCurrentUser();
  });

  // Staff PIN login via Firebase Callable Function `teamStaffLogin`
  ipcMain.handle(IPC_CHANNELS.AUTH_STAFF_PIN_LOGIN, async (_event, { workspaceCode, staffLoginId, pin }) => {
    try {
      const { staffPinLogin } = await import('../firebase/auth');
      const result = await staffPinLogin(workspaceCode, staffLoginId, pin);

      // Persist staff profile so it survives app restarts.
      // The Firebase Auth session is handled by the SDK (IndexedDB);
      // the staff profile (workspaceId, name, role) needs its own storage.
      if (result.success && result.staff) {
        saveStaffProfile({
          workspaceId: result.staff.workspaceId,
          staffUid: result.staff.uid,
          staffName: result.staff.name,
          staffRole: result.staff.role,
        });
      }

      return {
        success: result.success,
        customToken: result.customToken,
        staff: result.staff,
        errorCode: result.errorCode,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        customToken: null,
        staff: null,
        errorCode: error?.code ?? 'unknown',
        error: error?.message ?? 'Staff PIN login failed',
      };
    }
  });

  // ── Firestore POS Collection Handlers ──
  // Lazy-import firestore-pos.ts to avoid loading Firestore SDK at startup

  const resolveFirestore = async () => {
    return await import('../firebase/firestore-pos');
  };

  // Payments
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_PAYMENTS_CREATE, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.createPayment(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_PAYMENTS_LIST, async (_e, { workspaceId, filters }) => {
    try { const m = await resolveFirestore(); return await m.getPayments(workspaceId, filters); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_PAYMENTS_UPDATE, async (_e, { workspaceId, paymentId, updates }) => {
    try { const m = await resolveFirestore(); return await m.updatePayment(workspaceId, paymentId, updates as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_PAYMENTS_CREATE_WITH_ID, async (_e, { workspaceId, paymentId, data }) => {
    try { const m = await resolveFirestore(); return await m.createPaymentWithId(workspaceId, paymentId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Cash Sessions
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_OPEN, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.openCashSession(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_CLOSE, async (_e, { workspaceId, sessionId, closingData }) => {
    try { const m = await resolveFirestore(); return await m.closeCashSession(workspaceId, sessionId, closingData as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_GET_ACTIVE, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.getActiveCashSession(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_HISTORY, async (_e, { workspaceId, filters }) => {
    try { const m = await resolveFirestore(); return await m.getCashSessionHistory(workspaceId, filters); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Recipes
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RECIPES_LIST, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.getRecipes(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RECIPES_GET, async (_e, { workspaceId, recipeId }) => {
    try { const m = await resolveFirestore(); return await m.getRecipe(workspaceId, recipeId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RECIPES_CREATE, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.createRecipe(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RECIPES_UPDATE, async (_e, { workspaceId, recipeId, updates }) => {
    try { const m = await resolveFirestore(); return await m.updateRecipe(workspaceId, recipeId, updates as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Menu Items
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LIST, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.getMenuItems(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Menu Items (real-time) — forward onSnapshot updates to the renderer.
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LISTEN, async (_e, { workspaceId }) => {
    try {
      const m = await resolveFirestore();
      // Replace any existing listener (re-login / re-subscribe / StrictMode remount).
      menuItemsUnsubscribe?.();
      menuItemsUnsubscribe = null;
      menuItemsUnsubscribe = m.onMenuItemsChanged(workspaceId, (items) => {
        mainWindowRef?.webContents.send('firestore:menuItems:changed', { workspaceId, items });
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LISTEN_STOP, () => {
    menuItemsUnsubscribe?.();
    menuItemsUnsubscribe = null;
    return { success: true };
  });

  // Workspace currency (real-time) — forward onSnapshot updates to the renderer.
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WORKSPACE_GET, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.getWorkspaceCurrency(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WORKSPACE_LISTEN, async (_e, { workspaceId }) => {
    try {
      const m = await resolveFirestore();
      // Replace any existing listener (re-login / re-subscribe / StrictMode remount).
      stopWorkspaceListener();
      workspaceUnsubscribe = m.onWorkspaceCurrencyChanged(workspaceId, (data) => {
        const win = mainWindowRef;
        if (!win || win.isDestroyed()) return;
        try {
          win.webContents.send('firestore:workspace:changed', { workspaceId, ...data });
        } catch { /* window torn down mid-send — non-critical */ }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WORKSPACE_LISTEN_STOP, () => {
    stopWorkspaceListener();
    return { success: true };
  });

  // Tables
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_TABLES_LIST, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.getTables(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Orders
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_ORDERS_CREATE, async (_e, { workspaceId, orderNumber, data }) => {
    try { const m = await resolveFirestore(); return await m.createOrder(workspaceId, orderNumber, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE, async (_e, { workspaceId, orderNumber, updates }) => {
    try { const m = await resolveFirestore(); return await m.updateOrder(workspaceId, orderNumber, updates as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE_STATUS, async (_e, { workspaceId, orderNumber, status }) => {
    try { const m = await resolveFirestore(); return await m.updateOrderStatus(workspaceId, orderNumber, status); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_ORDERS_LIST, async (_e, { workspaceId, filters }) => {
    try { const m = await resolveFirestore(); return await m.listOrders(workspaceId, filters); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Coupons
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_COUPONS_GET_BY_CODE, async (_e, { workspaceId, code }) => {
    try { const m = await resolveFirestore(); return await m.getCouponByCode(workspaceId, code); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_COUPONS_INCREMENT_USAGE, async (_e, { workspaceId, couponId }) => {
    try { const m = await resolveFirestore(); return await m.incrementCouponUsage(workspaceId, couponId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Customers
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CUSTOMERS_LIST, async (_e, { workspaceId, searchTerm }) => {
    try { const m = await resolveFirestore(); return await m.listCustomers(workspaceId, searchTerm); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CUSTOMERS_CREATE, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.createCustomer(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_CUSTOMERS_UPDATE, async (_e, { workspaceId, customerId, updates }) => {
    try { const m = await resolveFirestore(); return await m.updateCustomer(workspaceId, customerId, updates as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Expenses
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_EXPENSES_LIST, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.listExpenses(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_EXPENSES_CREATE, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.createExpense(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Wallet
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WALLET_CUSTOMERS_LIST, async (_e, { workspaceId }) => {
    try { const m = await resolveFirestore(); return await m.listCustomersWithWallets(workspaceId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WALLET_TRANSACTIONS_LIST, async (_e, { workspaceId, customerId }) => {
    try { const m = await resolveFirestore(); return await m.listWalletTransactions(workspaceId, customerId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_WALLET_TRANSACTION_ADD, async (_e, { workspaceId, customerId, data }) => {
    try { const m = await resolveFirestore(); return await m.addWalletTransaction(workspaceId, customerId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Printer
  ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_KOT, async (_e, { orderData, settings }) => {
    try {
      const m = await import('./printer/index');
      return await m.printKOT(orderData, m.printerConfigFromStore(settings));
    } catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_BILL, async (_e, { orderData, settings }) => {
    try {
      const m = await import('./printer/index');
      return await m.printBill(orderData, m.printerConfigFromStore(settings));
    } catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_REPORT, async (_e, { reportData, paperWidth }) => {
    try {
      const { buildReportReceipt } = await import('./printer/reports-templates');
      const { send, writeReceiptText } = await import('./printer/transport');
      const { EscposBuilder } = await import('./printer/escpos-builder');
      const { builder, sections } = buildReportReceipt(reportData, paperWidth || 80);
      const bytes = builder.build();
      const label = `REPORT-${(reportData.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`;
      writeReceiptText(label, EscposBuilder.buildTextReceipt(paperWidth || 80, sections));
      return await send(bytes, label);
    } catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.PRINTER_PRINT_KITCHEN_BOARD, async (_e, { orders, paperWidth }) => {
    try {
      const { buildConsolidatedKOT } = await import('./printer/reports-templates');
      const { send, writeReceiptText } = await import('./printer/transport');
      const { EscposBuilder } = await import('./printer/escpos-builder');
      const { builder, sections } = buildConsolidatedKOT(orders, paperWidth || 80);
      const bytes = builder.build();
      const label = 'KITCHEN-BOARD';
      writeReceiptText(label, EscposBuilder.buildTextReceipt(paperWidth || 80, sections));
      return await send(bytes, label);
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  // Reservations
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RESERVATIONS_CREATE, async (_e, { workspaceId, data }) => {
    try { const m = await resolveFirestore(); return await m.createReservation(workspaceId, data as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RESERVATIONS_LIST, async (_e, { workspaceId, filters }) => {
    try { const m = await resolveFirestore(); return await m.getReservations(workspaceId, filters); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RESERVATIONS_UPDATE, async (_e, { workspaceId, reservationId, updates }) => {
    try { const m = await resolveFirestore(); return await m.updateReservation(workspaceId, reservationId, updates as any); }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle(IPC_CHANNELS.FIRESTORE_RESERVATIONS_CANCEL, async (_e, { workspaceId, reservationId }) => {
    try { const m = await resolveFirestore(); return await m.cancelReservation(workspaceId, reservationId); }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // ── Local SQLite (offline-first order writes) ──

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_WRITE, async (_e, orderData: Record<string, unknown>) => {
    try {
      console.log('[IPC] local:order:write invoked with orderNumber:', orderData.orderNumber);
      const { getDatabase } = await import('../database/connection');
      const { enqueueSyncEntry } = await import('../repositories/sqlite/sync-queue');
      const db = getDatabase();

      // Diagnostic: confirm DB state at write time
      const dbTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
      console.log('[IPC:LOCAL_ORDER_WRITE] DB path:', db.name, 'Tables:', dbTables.map((t: any) => t.name));
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

      const orderId = (orderData.orderNumber as string) || `D-${Date.now()}`;
      const orderNumber = parseInt((orderData.orderNumber as string)?.replace(/\D/g, '') || '0', 10) || Math.floor(Date.now() / 1000);
      const customerName = (orderData.customer as string) || 'Walk-in Guest';
      const customerId = (orderData.customerId as string) || '';
      const totalCents = toCents(orderData.total);
      const subtotalCents = toCents((orderData.totals as any)?.subtotal);
      const taxCents = toCents((orderData.totals as any)?.tax);
      const discountCents = toCents((orderData.totals as any)?.discount);
      const staffUid = (orderData.createdBy as string) || 'unknown';

      const runWrite = db.transaction(() => {
        // Upsert customer if named
        if (customerName !== 'Walk-in Guest' && customerName && customerId) {
          db.prepare(
            `INSERT OR IGNORE INTO customers (id, name, phone, email, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(customerId, customerName, (orderData.phone as string) || '', '', now, now);
        }

        // Write order (INSERT OR REPLACE — lets completePayment overwrite the KOT order with paid status)
        db.prepare(
          `INSERT OR REPLACE INTO orders (id, order_number, table_id, customer_id, order_type, status,
           subtotal_cents, tax_cents, discount_cents, total_cents,
           payment_status, payment_method, notes, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          orderId, orderNumber,
          (orderData.table as string) || null,
          customerId || null,
          (orderData.orderType as string) || 'Quick Bill',
          (orderData.orderStatus as string) || 'pending',
          subtotalCents, taxCents, discountCents, totalCents,
          (orderData.paymentStatus as string) || 'unpaid', (orderData.paymentMethod as string) || 'Cash',
          (orderData.notes as string) || null,
          staffUid, now, now,
        );

        // Write order items (cartRows) — replace any prior items for this order.
        db.prepare(`DELETE FROM order_items WHERE order_id = ?`).run(orderId);
        const cartRows = (orderData.cartRows as any[]) || [];
        for (const row of cartRows) {
          const itemId = `oi-${orderId}-${Math.random().toString(36).slice(2, 7)}`;
          const qty = Number(row.qty) || 1;
          const priceCents = toCents(row.itemPrice);
          db.prepare(
            `INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price_cents, total_price_cents, notes, status, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`
          ).run(itemId, orderId, (row.itemId as string) || '', (row.itemName as string) || 'Unknown',
            qty, priceCents, qty * priceCents, (row.note as string) || null, now, now);
        }
      });

      runWrite();

      // Enqueue sync_queue entry with the FULL Firestore document as payload
      enqueueSyncEntry(db, 'order', orderId, 'create', orderData,
        (orderData.workspaceId as string) || 'default', 'main');

      return { success: true, orderId };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Local order write failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_APPEND_ITEMS, async (_e, { orderId, cartRows, totals }: { orderId: string; cartRows: any[]; totals?: { subtotal?: number; tax?: number; discount?: number; total?: number } }) => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

      const runAppend = db.transaction(() => {
        // Update the order's totals (caller passes fresh rupee totals).
        if (totals) {
          db.prepare(
            `UPDATE orders SET subtotal_cents = ?, tax_cents = ?, discount_cents = ?, total_cents = ?, updated_at = ? WHERE id = ?`
          ).run(
            toCents(totals.subtotal), toCents(totals.tax), toCents(totals.discount), toCents(totals.total), now, orderId,
          );
        } else {
          db.prepare(`UPDATE orders SET updated_at = ? WHERE id = ?`).run(now, orderId);
        }

        // Insert new order_items
        for (const row of cartRows) {
          const itemId = `oi-${orderId}-${Math.random().toString(36).slice(2, 7)}`;
          const qty = Number(row.qty) || 1;
          const priceCents = toCents(row.itemPrice);
          db.prepare(
            `INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price_cents, total_price_cents, notes, status, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)`
          ).run(itemId, orderId, (row.itemId as string) || '', (row.itemName as string) || 'Unknown',
            qty, priceCents, qty * priceCents, (row.note as string) || null, now, now);
        }
      });
      runAppend();
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_GET, async (_e, { orderNumber }: { orderNumber: string }) => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();

      // Get order by order_number (text field matching 'D-1047' format)
      const order = db.prepare(
        `SELECT * FROM orders WHERE id = ?`
      ).get(orderNumber) as Record<string, unknown> | undefined;

      if (!order) return { success: false, error: 'Order not found' };

      // Get order items
      const items = db.prepare(
        `SELECT * FROM order_items WHERE order_id = ?`
      ).all(orderNumber) as Record<string, unknown>[];

      // Map to the cart row shape expected by Billing.tsx
      const cartRows = items.map((row) => ({
        itemId: row.product_id || '',
        itemName: row.name || '',
        itemPrice: fromCents(row.unit_price_cents),
        qty: row.quantity || 1,
        note: row.notes || '',
      }));

      return {
        success: true,
        order: {
          orderNumber: order.id,
          orderType: order.order_type,
          tableId: order.table_id,
          customerId: order.customer_id,
          total: fromCents(order.total_cents),
          subtotal: fromCents(order.subtotal_cents),
          discount: fromCents(order.discount_cents),
          tax: fromCents(order.tax_cents),
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          notes: order.notes,
          status: order.status,
          cartRows,
        },
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_LIST_PENDING, async (_e, { orderType }: { orderType: string }) => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      const rows = db.prepare(
        `SELECT o.id, o.order_number, o.total_cents, o.customer_id, o.notes, o.created_at,
                c.name AS customer_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         WHERE o.order_type = ? AND o.payment_status = 'unpaid' AND o.status != 'cancelled'
         ORDER BY o.created_at DESC`
      ).all(orderType) as Record<string, unknown>[];

      const pending = rows.map((r) => ({
        orderNumber: r.id,
        orderNumberDisplay: r.order_number,
        total: fromCents(r.total_cents),
        customerName: (r.customer_name as string) || undefined,
        itemCount: r.item_count || 0,
        createdAt: r.created_at,
      }));
      return { success: true, pending };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_CANCEL, async (_e, { orderNumber, reason, workspaceId }: { orderNumber: string; reason: string; workspaceId?: string }) => {
    try {
      const { getDatabase } = await import('../database/connection');
      const { enqueueSyncEntry } = await import('../repositories/sqlite/sync-queue');
      const db = getDatabase();
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const nowIso = new Date().toISOString();
      const safeReason = (reason ?? '').trim();
      if (!safeReason) {
        return { success: false, error: 'Cancellation reason is required' };
      }
      db.prepare(`UPDATE orders SET status = 'cancelled', payment_status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?`).run(safeReason, now, orderNumber);

      // Enqueue sync entry with a PosOrder-camelCase payload so sync-drain's
      // replayOrder can resolve workspaceId + orderNumber correctly and deliver
      // the cancellation to the right Firestore document.
      // Unlike the raw SQLite row (snake_case), this payload matches the shape
      // that LOCAL_ORDER_WRITE already uses successfully.
      const wsId = workspaceId || 'default';
      enqueueSyncEntry(db, 'order', orderNumber, 'update', {
        orderNumber,
        workspaceId: wsId,
        orderStatus: 'cancelled',
        cancelReason: safeReason,
        updatedAt: nowIso,
        _cancelSyncNote: 'Partial update — replayOrder must merge (not overwrite) this payload.',
      }, wsId, 'main');

      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_ORDER_UPDATE_TYPE, async (_e, { orderNumber, orderType, tableId }: { orderNumber: string; orderType: string; tableId?: string }) => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      db.prepare(
        `UPDATE orders SET order_type = ?, table_id = ?, updated_at = ? WHERE id = ?`
      ).run(orderType, tableId || null, now, orderNumber);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message }; }
  });

  ipcMain.handle(IPC_CHANNELS.LOCAL_SYNC_PENDING_COUNT, async () => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      const row = db.prepare(
        "SELECT COUNT(*) AS cnt FROM sync_queue WHERE status IN ('pending', 'failed', 'processing')"
      ).get() as { cnt: number } | undefined;
      const stuck = db.prepare(
        "SELECT COUNT(*) AS cnt FROM sync_queue WHERE status = 'conflict'"
      ).get() as { cnt: number } | undefined;
      return { count: row?.cnt ?? 0, stuck: stuck?.cnt ?? 0 };
    } catch {
      return { count: 0, stuck: 0 };
    }
  });

  // Database handlers (deferred — database modules will be used when DB is set up)
  /**
   * Highest order number already issued locally. Used by Settings to stop the
   * bill counter being rewound over paid orders.
   *
   * Replaces the old db:query channel, which accepted arbitrary SQL from the
   * renderer. This takes no input at all, so there is nothing to validate.
   */
  ipcMain.handle(IPC_CHANNELS.DB_GET_MAX_ORDER_NUMBER, async () => {
    try {
      const { getDatabase } = await import('../database/connection');
      const db = getDatabase();
      const row = db
        .prepare('SELECT MAX(order_number) AS max_order FROM orders')
        .get() as { max_order: number | null } | undefined;
      return Number(row?.max_order) || 0;
    } catch (error: any) {
      throw new Error(`DB getMaxOrderNumber error: ${error.message}`);
    }
  });

}
