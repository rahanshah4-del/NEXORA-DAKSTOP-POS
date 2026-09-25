import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

const api = {
  auth: {
    signIn: (email: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_SIGN_IN, { email, password }),
    signOut: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_SIGN_OUT),
    getCurrentUser: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_CURRENT_USER),
    staffPinLogin: (workspaceCode: string, staffLoginId: string, pin: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_STAFF_PIN_LOGIN, { workspaceCode, staffLoginId, pin }),
    getStaffProfile: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_STAFF_PROFILE),
    saveLoginCreds: (workspaceCode: string, staffLoginId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_SAVE_LOGIN_CREDS, { workspaceCode, staffLoginId }),
    loadLoginCreds: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOAD_LOGIN_CREDS),
    clearLoginCreds: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_CLEAR_LOGIN_CREDS),
    verifyStaffPin: (workspaceId: string, pin: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_VERIFY_STAFF_PIN, { workspaceId, pin }),
    onStateChanged: (callback: (state: { signedIn: boolean; uid: string | null }) => void) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        state: { signedIn: boolean; uid: string | null },
      ) => callback(state);
      ipcRenderer.on(IPC_CHANNELS.AUTH_STATE_CHANGED, handler);
      // Remove the exact wrapper that was registered — not the bare callback.
      return () => { ipcRenderer.removeListener(IPC_CHANNELS.AUTH_STATE_CHANGED, handler); };
    },
  },
  db: {
    // Named, fixed-query channels only. The former `query`/`execute` pair let
    // the renderer run arbitrary SQL against the local database.
    getMaxOrderNumber: (): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.DB_GET_MAX_ORDER_NUMBER),
  },
  firestore: {
    payments: {
      create: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_PAYMENTS_CREATE, { workspaceId, data }),
      list: (workspaceId: string, filters?: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_PAYMENTS_LIST, { workspaceId, filters }),
      update: (workspaceId: string, paymentId: string, updates: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_PAYMENTS_UPDATE, { workspaceId, paymentId, updates }),
      createWithId: (workspaceId: string, paymentId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_PAYMENTS_CREATE_WITH_ID, { workspaceId, paymentId, data }),
    },
    cashSessions: {
      open: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_OPEN, { workspaceId, data }),
      close: (workspaceId: string, sessionId: string, closingData: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_CLOSE, { workspaceId, sessionId, closingData }),
      getActive: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_GET_ACTIVE, { workspaceId }),
      history: (workspaceId: string, filters?: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CASH_SESSIONS_HISTORY, { workspaceId, filters }),
    },
    recipes: {
      list: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RECIPES_LIST, { workspaceId }),
      get: (workspaceId: string, recipeId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RECIPES_GET, { workspaceId, recipeId }),
      create: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RECIPES_CREATE, { workspaceId, data }),
      update: (workspaceId: string, recipeId: string, updates: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RECIPES_UPDATE, { workspaceId, recipeId, updates }),
    },
    tables: {
      list: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_TABLES_LIST, { workspaceId }),
    },
    workspace: {
      get: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WORKSPACE_GET, { workspaceId }),
      subscribe: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WORKSPACE_LISTEN, { workspaceId }),
      unsubscribe: () =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WORKSPACE_LISTEN_STOP),
      onChanged: (
        callback: (payload: {
          workspaceId: string;
          currency: string | null;
          currencySymbol: string;
          exists: boolean;
        }) => void,
      ) => {
        const handler = (
          _event: Electron.IpcRendererEvent,
          payload: { workspaceId: string; currency: string | null; currencySymbol: string; exists: boolean },
        ) => callback(payload);
        ipcRenderer.on('firestore:workspace:changed', handler);
        return () => {
          ipcRenderer.removeListener('firestore:workspace:changed', handler);
        };
      },
    },
    menuItems: {
      list: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LIST, { workspaceId }),
      subscribe: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LISTEN, { workspaceId }),
      unsubscribe: () =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_MENU_ITEMS_LISTEN_STOP),
      onChanged: (callback: (payload: { workspaceId: string; items: unknown[] }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, payload: { workspaceId: string; items: unknown[] }) =>
          callback(payload);
        ipcRenderer.on('firestore:menuItems:changed', handler);
        return () => {
          ipcRenderer.removeListener('firestore:menuItems:changed', handler);
        };
      },
    },
    reservations: {
      create: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RESERVATIONS_CREATE, { workspaceId, data }),
      list: (workspaceId: string, filters?: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RESERVATIONS_LIST, { workspaceId, filters }),
      update: (workspaceId: string, reservationId: string, updates: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RESERVATIONS_UPDATE, { workspaceId, reservationId, updates }),
      cancel: (workspaceId: string, reservationId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_RESERVATIONS_CANCEL, { workspaceId, reservationId }),
    },
    orders: {
      create: (workspaceId: string, orderNumber: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_ORDERS_CREATE, { workspaceId, orderNumber, data }),
      update: (workspaceId: string, orderNumber: string, updates: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE, { workspaceId, orderNumber, updates }),
      updateStatus: (workspaceId: string, orderNumber: string, status: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_ORDERS_UPDATE_STATUS, { workspaceId, orderNumber, status }),
      list: (workspaceId: string, filters?: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_ORDERS_LIST, { workspaceId, filters }),
    },
    coupons: {
      getByCode: (workspaceId: string, code: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_COUPONS_GET_BY_CODE, { workspaceId, code }),
      incrementUsage: (workspaceId: string, couponId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_COUPONS_INCREMENT_USAGE, { workspaceId, couponId }),
    },
    customers: {
      list: (workspaceId: string, searchTerm?: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CUSTOMERS_LIST, { workspaceId, searchTerm }),
      create: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CUSTOMERS_CREATE, { workspaceId, data }),
      update: (workspaceId: string, customerId: string, updates: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_CUSTOMERS_UPDATE, { workspaceId, customerId, updates }),
    },
    expenses: {
      list: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_EXPENSES_LIST, { workspaceId }),
      create: (workspaceId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_EXPENSES_CREATE, { workspaceId, data }),
    },
    wallet: {
      customersList: (workspaceId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WALLET_CUSTOMERS_LIST, { workspaceId }),
      transactionsList: (workspaceId: string, customerId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WALLET_TRANSACTIONS_LIST, { workspaceId, customerId }),
      transactionAdd: (workspaceId: string, customerId: string, data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.FIRESTORE_WALLET_TRANSACTION_ADD, { workspaceId, customerId, data }),
    },
  },
  printer: {
    printKOT: (orderData: Record<string, unknown>, settings: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_KOT, { orderData, settings }),
    printBill: (orderData: Record<string, unknown>, settings: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_BILL, { orderData, settings }),
    printReport: (reportData: Record<string, unknown>, paperWidth?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_REPORT, { reportData, paperWidth }),
    printKitchenBoard: (orders: Record<string, unknown>[], paperWidth?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PRINTER_PRINT_KITCHEN_BOARD, { orders, paperWidth }),
  },
  local: {
    orders: {
      write: (data: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_WRITE, data),
      get: (orderNumber: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_GET, { orderNumber }),
      appendItems: (orderId: string, cartRows: Record<string, unknown>[], totals?: Record<string, unknown>) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_APPEND_ITEMS, { orderId, cartRows, totals }),
      listPending: (orderType: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_LIST_PENDING, { orderType }),
      cancel: (orderNumber: string, reason: string, workspaceId?: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_CANCEL, { orderNumber, reason, workspaceId }),
      updateType: (orderNumber: string, orderType: string, tableId?: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_ORDER_UPDATE_TYPE, { orderNumber, orderType, tableId }),
    },
    sync: {
      pendingCount: () =>
        ipcRenderer.invoke(IPC_CHANNELS.LOCAL_SYNC_PENDING_COUNT),
      onResult: (callback: (result: { completed: number; failed: number; stuck: number; total: number }) => void) => {
        const handler = (_event: Electron.IpcRendererEvent, result: any) => callback(result);
        ipcRenderer.on('sync:result', handler);
        return () => { ipcRenderer.removeListener('sync:result', handler); };
      },
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
        callback(isMaximized);
      ipcRenderer.on('window:maximizeChange', handler);
      return () => {
        ipcRenderer.removeListener('window:maximizeChange', handler);
      };
    },
    onNavigate: (callback: (route: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, route: string) => callback(route);
      ipcRenderer.on('navigate', handler);
      return () => {
        ipcRenderer.removeListener('navigate', handler);
      };
    },
  },
  app: {
    log: (level: 'info' | 'warn' | 'error', message: string, meta?: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_LOG, { level, message, meta }),
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
    checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_FOR_UPDATES),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update:checking', callback);
      return () => ipcRenderer.removeListener('update:checking', callback);
    },
    onUpdateAvailable: (callback: (info: unknown) => void) => {
      ipcRenderer.on('update:available', (_e, info) => callback(info));
      return () => ipcRenderer.removeListener('update:available', callback);
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on('update:not-available', callback);
      return () => ipcRenderer.removeListener('update:not-available', callback);
    },
    onUpdateDownloaded: (callback: () => void) => {
      ipcRenderer.on('update:downloaded', callback);
      return () => ipcRenderer.removeListener('update:downloaded', callback);
    },
    onUpdateError: (callback: (message: string) => void) => {
      ipcRenderer.on('update:error', (_e, message) => callback(message));
      return () => ipcRenderer.removeListener('update:error', callback);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
