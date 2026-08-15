/**
 * firestore-pos.ts — Workspace-scoped Firestore CRUD for the Desktop POS.
 *
 * All data lives under:  workspaces/{workspaceId}/<collectionName>
 *
 * Collections:
 *   restaurantPayments      — payment records
 *   restaurantCashSessions  — cash drawer open/close sessions
 *   restaurantRecipes       — recipe/menu-item definitions
 *   restaurantReservations  — table reservations
 *
 * ⚠️  Assumption (verify against web frontend):
 *   Field names follow camelCase convention matching the web app's existing
 *   document shapes. If the production web app uses different field names,
 *   update the TypeScript interfaces below.
 *   Reference files (not accessible locally): useRestaurantPayments.js,
 *   useRestaurantCashSessions.js, useRestaurantRecipes.js
 */

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, increment,
  serverTimestamp, type DocumentData, type Unsubscribe,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseFirestore, getFirebaseAuth } from './config';

function db() { return getFirebaseFirestore(); }

/**
 * Returns the currently authenticated user's UID from Firebase Auth.
 * Returns 'system' if no user is signed in (shouldn't happen in normal flow).
 */
function currentUserId(): string {
  try {
    const auth = getFirebaseAuth();
    return auth.currentUser?.uid ?? 'system';
  } catch {
    return 'system';
  }
}

// ── DEBUG: Auth session diagnostics ──
async function debugAuthSession(label: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    console.log(`[DEBUG ${label}] auth.currentUser:`, user ? user.uid : 'NULL');
    if (user) {
      try {
        const token = await user.getIdToken(true); // force refresh
        console.log(`[DEBUG ${label}] ID token refreshed OK, length:`, token.length);
      } catch (e: any) {
        console.error(`[DEBUG ${label}] ID token refresh FAILED:`, e.code, e.message, e);
      }
    } else {
      console.warn(`[DEBUG ${label}] ⚠️ NO FIREBASE AUTH SESSION — Firestore queries will fail with permission-denied`);
    }
  } catch (e: any) {
    console.error(`[DEBUG ${label}] auth session check error:`, e);
  }
}

// ── Workspace-scoped path helpers ──

function wCol(workspaceId: string, name: string) {
  return collection(db(), 'workspaces', workspaceId, name);
}
function wDoc(workspaceId: string, name: string, docId: string) {
  return doc(db(), 'workspaces', workspaceId, name, docId);
}

// ── Safe Write Helpers ──

/**
 * Prepends the 3 required fields that Firestore safeCreate() rules demand:
 *   - workspaceId  (from function parameter — cannot be spoofed by the caller)
 *   - createdBy    (from Firebase Auth currentUser.uid — cannot be spoofed)
 *   - ownerId      (set equal to workspaceId based on production data pattern)
 *
 * Also adds createdAt/updatedAt timestamps.
 *
 * Callers do NOT need to pass these fields — they are added automatically.
 */
function safeWriteFields(workspaceId: string) {
  const now = new Date().toISOString();
  return {
    workspaceId,
    createdBy: currentUserId(),
    ownerId: workspaceId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Fields to strip from updates — these should never be changed by callers.
 * safeUpdate() rules check that workspaceId/ownerId remain unchanged.
 */
function safeUpdateFields() {
  return {
    updatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
//  orders
// ═══════════════════════════════════════════════════════════

export interface PosCartRow {
  itemId: string;
  itemName: string;
  itemPrice: number;
  qty: number;
  note: string;
}

export interface PosOrderTotals {
  subtotal: number;
  discount: number;
  netSubtotal: number;
  serviceCharges: number;
  tax: number;
  total: number;
}

export interface PosOrder {
  orderNumber: string;
  billNumber: string;
  kotNumber: string;
  orderType: string;          // Dine-in, Takeaway, Delivery, Quick Bill
  table: string;
  source: string;             // 'desktop'
  notes: string;
  customer: string;
  customerId: string;
  phone: string;
  deliveryAddress: string;
  riderNotes: string;
  cartRows: PosCartRow[];
  totals: PosOrderTotals;
  // Audit fields — preserve the inputs so historical orders survive setting changes
  discountType: string;        // 'percentage', 'fixed', 'free_product', 'free_delivery', or 'none'
  discountPercent: number;     // raw manual percentage the user typed (e.g. 10)
  couponCode: string;          // applied coupon code (empty if none)
  couponId: string;            // Firestore doc ID of applied coupon
  couponDiscount: number;      // currency amount from coupon (0 if no coupon)
  couponType: string;          // 'percentage' | 'fixed' | 'free_product' | 'free_delivery'
  taxRates: { cgst: string; sgst: string };       // rates in effect (e.g. '2.5', '2.5')
  taxBreakdown: { cgst: number; sgst: number };   // computed split amounts
  currency: string;            // currency code in effect (e.g. 'PKR', 'INR')
  total: number;
  paidAmount: number;
  dueAmount: number;
  orderStatus: string;        // pending, preparing, ready, served, cancelled
  paymentStatus: string;      // due, partial, paid, cancelled
  paymentMethod: string;
  lastPaymentId: string;
  lastPaymentAt: string;
  cancelReason?: string;       // populated when an order is cancelled from the POS
  createdBy: string;
  staffName: string;
  staffId: string;
  workspaceId: string;
  businessType: string;       // 'restaurant'
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Creates a new order document in workspaces/{workspaceId}/orders/{orderNumber}.
 * The document ID is the order number itself (e.g. "D-45267"), so it's
 * trivially lookup-able and compatible with the website "W-" prefix convention.
 */
export async function createOrder(
  workspaceId: string,
  orderNumber: string,
  data: PosOrder,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'orders', orderNumber);
    await setDoc(docRef, {
      ...data,
      orderNumber, // ensure it matches the doc ID
      ...safeWriteFields(workspaceId),
    }, { merge: true });
    return { success: true, id: orderNumber };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create order' };
  }
}

/**
 * Updates an existing order document (partial update).
 */
export async function updateOrder(
  workspaceId: string,
  orderNumber: string,
  updates: Partial<PosOrder>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'orders', orderNumber);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update order' };
  }
}

/**
 * Convenience wrapper: updates only the orderStatus field.
 */
export async function updateOrderStatus(
  workspaceId: string,
  orderNumber: string,
  newStatus: string,
): Promise<{ success: boolean; error?: string }> {
  return updateOrder(workspaceId, orderNumber, { orderStatus: newStatus } as Partial<PosOrder>);
}

export interface ListOrdersFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * Lists orders from workspaces/{workspaceId}/orders, ordered by createdAt desc.
 *
 * IMPORTANT: If Firestore returns a failed-precondition error, it likely means
 * a composite index is needed. The full error message (with creation URL) is
 * surfaced to the caller — do NOT swallow it.
 */
export async function listOrders(
  workspaceId: string,
  filters?: ListOrdersFilters,
): Promise<{ success: boolean; orders?: PosOrder[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'orders');
    const constraints: any[] = [orderBy('createdAt', 'desc')];

    if (filters?.status) {
      constraints.unshift(where('orderStatus', '==', filters.status));
    }
    if (filters?.startDate) {
      constraints.unshift(where('createdAt', '>=', filters.startDate));
    }
    if (filters?.endDate) {
      constraints.unshift(where('createdAt', '<=', filters.endDate));
    }
    if (filters?.limit) {
      constraints.push(limit(filters.limit));
    }

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    const orders = snap.docs.map((d) => ({ ...d.data() } as PosOrder));
    return { success: true, orders };
  } catch (err: any) {
    // Surface the FULL error including any index-creation URL
    const detail = err?.message ?? 'Failed to list orders';
    return { success: false, error: detail };
  }
}

// ═══════════════════════════════════════════════════════════
//  restaurantPayments
// ═══════════════════════════════════════════════════════════

export interface PosPayment {
  id?: string;
  orderId: string;
  amountCents: number;
  method: string;           // cash, card, upi, wallet, credit
  status: string;           // paid, refunded, voided
  tipCents?: number;
  reference?: string;
  notes?: string;
  processedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function createPayment(
  workspaceId: string, data: PosPayment,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantPayments');
    const docRef = doc(colRef);
    await setDoc(docRef, { ...data, ...safeWriteFields(workspaceId) });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create payment' };
  }
}

/**
 * Create a payment with a DETERMINISTIC document ID (e.g. "PMT-D-1008").
 * Safe for replay — a second call with the same ID overwrites the same
 * document rather than creating a duplicate. This is what the sync drain
 * engine calls to ensure idempotency.
 */
export async function createPaymentWithId(
  workspaceId: string, paymentId: string, data: PosPayment,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantPayments', paymentId);
    await setDoc(docRef, { ...data, ...safeWriteFields(workspaceId) });
    return { success: true, id: paymentId };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create payment' };
  }
}

export async function getPayments(
  workspaceId: string,
  filters?: { orderId?: string; startDate?: string; endDate?: string; limit?: number },
): Promise<{ success: boolean; payments?: PosPayment[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantPayments');
    const constraints: any[] = [];
    if (filters?.orderId) constraints.push(where('orderId', '==', filters.orderId));
    if (filters?.startDate) constraints.push(where('createdAt', '>=', filters.startDate));
    if (filters?.endDate) constraints.push(where('createdAt', '<=', filters.endDate));
    constraints.push(orderBy('createdAt', 'desc'));
    if (filters?.limit) constraints.push(limit(filters.limit));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() } as PosPayment));
    return { success: true, payments };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch payments' };
  }
}

export async function updatePayment(
  workspaceId: string, paymentId: string, updates: Partial<PosPayment>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantPayments', paymentId);
    await updateDoc(docRef, { ...updates, ...safeUpdateFields() });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update payment' };
  }
}

// ═══════════════════════════════════════════════════════════
//  restaurantCashSessions
// ═══════════════════════════════════════════════════════════

export interface CashSession {
  id?: string;
  openedBy: string;          // staff uid
  openedByName: string;
  openingBalanceCents: number;
  closedBy?: string;
  closedByName?: string;
  closingBalanceCents?: number;
  expectedBalanceCents?: number;
  differenceCents?: number;
  status: 'open' | 'closed';
  notes?: string;
  openedAt?: string;
  closedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function openCashSession(
  workspaceId: string, data: CashSession,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantCashSessions');
    const docRef = doc(colRef);
    const now = new Date().toISOString();
    await setDoc(docRef, {
      ...data,
      status: 'open',
      openedAt: now,
      ...safeWriteFields(workspaceId),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to open cash session' };
  }
}

export async function closeCashSession(
  workspaceId: string, sessionId: string, closingData: Partial<CashSession>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantCashSessions', sessionId);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      ...closingData,
      status: 'closed',
      closedAt: now,
      ...safeUpdateFields(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to close cash session' };
  }
}

export async function getActiveCashSession(
  workspaceId: string,
): Promise<{ success: boolean; session?: CashSession | null; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantCashSessions');
    const q = query(colRef, where('status', '==', 'open'), orderBy('openedAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return { success: true, session: null };
    const doc = snap.docs[0];
    return { success: true, session: { id: doc.id, ...doc.data() } as CashSession };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch active cash session' };
  }
}

/**
 * REAL-TIME: Listen for changes to the active cash session.
 * Calls `onChange` with the current session (or null) whenever it opens/closes.
 * Returns an unsubscribe function.
 */
export function onActiveCashSessionChanged(
  workspaceId: string,
  onChange: (session: CashSession | null) => void,
): Unsubscribe {
  const colRef = wCol(workspaceId, 'restaurantCashSessions');
  const q = query(colRef, where('status', '==', 'open'), orderBy('openedAt', 'desc'), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) { onChange(null); return; }
    const doc = snap.docs[0];
    onChange({ id: doc.id, ...doc.data() } as CashSession);
  }, (err) => {
    console.error('[CashSession.onSnapshot] Error:', err.message);
  });
}

export async function getCashSessionHistory(
  workspaceId: string,
  filters?: { startDate?: string; endDate?: string; limit?: number },
): Promise<{ success: boolean; sessions?: CashSession[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantCashSessions');
    const constraints: any[] = [orderBy('openedAt', 'desc')];
    if (filters?.startDate) constraints.unshift(where('openedAt', '>=', filters.startDate));
    if (filters?.endDate) constraints.unshift(where('openedAt', '<=', filters.endDate));
    if (filters?.limit) constraints.push(limit(filters.limit));
    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as CashSession));
    return { success: true, sessions };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch cash session history' };
  }
}

// ═══════════════════════════════════════════════════════════
//  restaurantRecipes
// ═══════════════════════════════════════════════════════════

export interface PosRecipe {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  ingredients?: Array<{ name: string; quantity: string; unit: string }>;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  priceCents?: number;
  costCents?: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getRecipes(
  workspaceId: string,
): Promise<{ success: boolean; recipes?: PosRecipe[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantRecipes');
    const q = query(colRef, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const recipes = snap.docs.map(d => ({ id: d.id, ...d.data() } as PosRecipe));
    return { success: true, recipes };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch recipes' };
  }
}

export async function getRecipe(
  workspaceId: string, recipeId: string,
): Promise<{ success: boolean; recipe?: PosRecipe | null; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantRecipes', recipeId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: true, recipe: null };
    return { success: true, recipe: { id: snap.id, ...snap.data() } as PosRecipe };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch recipe' };
  }
}

export async function createRecipe(
  workspaceId: string, data: PosRecipe,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantRecipes');
    const docRef = doc(colRef);
    await setDoc(docRef, { ...data, ...safeWriteFields(workspaceId) });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create recipe' };
  }
}

export async function updateRecipe(
  workspaceId: string, recipeId: string, updates: Partial<PosRecipe>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantRecipes', recipeId);
    await updateDoc(docRef, { ...updates, ...safeUpdateFields() });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update recipe' };
  }
}

// ═══════════════════════════════════════════════════════════
//  menuItems
// ═══════════════════════════════════════════════════════════

export interface PosMenuItem {
  id?: string;
  name: string;
  category?: string;
  price?: number;        // rupees (not cents — this collection stores price directly)
  cost?: number;
  status?: string;       // 'Active' | 'Inactive'
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getMenuItems(
  workspaceId: string,
): Promise<{ success: boolean; items?: PosMenuItem[]; error?: string }> {
  try {
    await debugAuthSession('getMenuItems');
    const colRef = wCol(workspaceId, 'menuItems');
    const colPath = `workspaces/${workspaceId}/menuItems`;
    console.log('[DEBUG getMenuItems] collection path:', colPath);
    console.log('[DEBUG getMenuItems] workspaceId:', JSON.stringify(workspaceId));

    // ── CONTROL TEST: unfiltered query — same shape as getTables() which works ──
    // If this succeeds and returns docs, the composite index is the culprit.
    // If this also fails with permission-denied, rules/collection name is the issue.
    let unfilteredOk = false;
    try {
      const qUnfiltered = query(colRef, orderBy('name', 'asc'));
      const snapUnfiltered = await getDocs(qUnfiltered);
      unfilteredOk = true;
      console.log('[DEBUG getMenuItems] CONTROL (no where, just orderBy name) — size:', snapUnfiltered.size,
        'docs:', snapUnfiltered.docs.map(d => ({ id: d.id, name: d.data().name, status: d.data().status })));
    } catch (ctrlErr: any) {
      // Log the RAW error from the unfiltered query before anything wraps it
      console.error('[DEBUG getMenuItems] CONTROL QUERY FAILED — raw error:');
      console.error('  code   :', ctrlErr?.code);
      console.error('  message:', ctrlErr?.message);
      console.error('  full   :', ctrlErr);
    }

    // ── FILTERED query: where('status','==','Active') + orderBy('name','asc') ──
    // This needs a composite index on (status ASC, name ASC).
    // If the index is missing Firestore returns failed-precondition with a
    // console URL to create it — NOT a permission-denied error.
    const q = query(colRef, orderBy('name', 'asc'));
    let snap;
    try {
      snap = await getDocs(q);
      console.log('[DEBUG getMenuItems] FILTERED (status=="Active" + orderBy name) — size:', snap.size,
        'docs:', snap.docs.map(d => ({ id: d.id, name: d.data().name, status: d.data().status })));
    } catch (filteredErr: any) {
      // Log the RAW unmodified error — Firestore index URLs appear here
      console.error('[DEBUG getMenuItems] FILTERED QUERY FAILED — raw error:');
      console.error('  code   :', filteredErr?.code);
      console.error('  message:', filteredErr?.message);
      console.error('  full   :', filteredErr);
      // Re-throw so the outer catch surfaces it cleanly
      throw filteredErr;
    }

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as PosMenuItem));
    return { success: true, items };
  } catch (err: any) {
    console.error('[DEBUG getMenuItems] FINAL ERROR — code:', err?.code, 'message:', err?.message);
    return { success: false, error: err.message ?? 'Failed to fetch menu items' };
  }
}

/**
 * REAL-TIME: Listen for changes to the workspace's menuItems collection.
 *
 * Calls `onChange` with the current active menu items on every snapshot
 * (initial fetch + subsequent writes/deletes), using the same filtered query
 * as getMenuItems (status=='Active' + orderBy name) so behavior stays
 * consistent with the manual "Load Menu & Tables" fetch.
 *
 * Returns an unsubscribe function. The onSnapshot error handler mirrors the
 * onActiveCashSessionChanged pattern (logs, never silently swallows).
 */
export function onMenuItemsChanged(
  workspaceId: string,
  onChange: (items: PosMenuItem[]) => void,
): Unsubscribe {
  const colRef = wCol(workspaceId, 'menuItems');
  const q = query(colRef, orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PosMenuItem));
      onChange(items);
    },
    (err) => {
      console.error('[onMenuItemsChanged] Error:', err.message);
    },
  );
}

// ═══════════════════════════════════════════════════════════
//  tables
// ═══════════════════════════════════════════════════════════

export interface PosTable {
  id?: string;
  name: string;
  section?: string;
  capacity?: number;
  status?: string; // available, occupied, reserved, billing
  createdAt?: string;
  updatedAt?: string;
}

export async function getTables(
  workspaceId: string,
): Promise<{ success: boolean; tables?: PosTable[]; error?: string }> {
  try {
    await debugAuthSession('getTables');
    const colRef = wCol(workspaceId, 'tables');
    const colPath = `workspaces/${workspaceId}/tables`;
    console.log('[DEBUG getTables] collection path:', colPath);
    console.log('[DEBUG getTables] workspaceId:', JSON.stringify(workspaceId));

    const q = query(colRef, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    console.log('[DEBUG getTables] snapshot.size:', snap.size, 'docs.length:', snap.docs.length);
    if (snap.docs.length > 0) {
      console.log('[DEBUG getTables] raw docs:',
        snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } else {
      console.warn('[DEBUG getTables] ⚠️ ZERO documents returned for path:', colPath);
    }

    const tables = snap.docs.map(d => ({ id: d.id, ...d.data() } as PosTable));
    return { success: true, tables };
  } catch (err: any) {
    console.error('[DEBUG getTables] ERROR:', err.message, err);
    return { success: false, error: err.message ?? 'Failed to fetch tables' };
  }
}

// ═══════════════════════════════════════════════════════════
//  restaurantReservations
// ═══════════════════════════════════════════════════════════

export interface PosReservation {
  id?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  date: string;            // ISO date (YYYY-MM-DD)
  time: string;            // HH:MM
  tableId?: string;
  tableName?: string;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no-show';
  notes?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function createReservation(
  workspaceId: string, data: PosReservation,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantReservations');
    const docRef = doc(colRef);
    await setDoc(docRef, { ...data, ...safeWriteFields(workspaceId) });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create reservation' };
  }
}

export async function getReservations(
  workspaceId: string,
  filters?: { date?: string; status?: string; limit?: number },
): Promise<{ success: boolean; reservations?: PosReservation[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'restaurantReservations');
    const constraints: any[] = [orderBy('date', 'asc'), orderBy('time', 'asc')];
    if (filters?.date) constraints.unshift(where('date', '==', filters.date));
    if (filters?.status) constraints.unshift(where('status', '==', filters.status));
    if (filters?.limit) constraints.push(limit(filters.limit));
    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);
    const reservations = snap.docs.map(d => ({ id: d.id, ...d.data() } as PosReservation));
    return { success: true, reservations };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch reservations' };
  }
}

export async function updateReservation(
  workspaceId: string, reservationId: string, updates: Partial<PosReservation>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantReservations', reservationId);
    await updateDoc(docRef, { ...updates, ...safeUpdateFields() });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update reservation' };
  }
}

export async function cancelReservation(
  workspaceId: string, reservationId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'restaurantReservations', reservationId);
    await updateDoc(docRef, { status: 'cancelled', ...safeUpdateFields() });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to cancel reservation' };
  }
}

// ═══════════════════════════════════════════════════════════
//  loyaltyCoupons
// ═══════════════════════════════════════════════════════════

export interface PosCoupon {
  id?: string;
  code: string;
  name?: string;
  description?: string;
  type?: string;              // 'percentage' | 'fixed' | 'free_product' | 'free_delivery'
  discountType?: string;      // alias: some schemas use 'type', some use 'discountType'
  discountValue?: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  usedCount?: number;
  startsAt?: any;             // Firestore Timestamp or ISO string
  expiresAt?: any;            // Firestore Timestamp or ISO string
  active?: boolean;
  freeProductName?: string;
  freeProductId?: string;
  workspaceId?: string;
  ownerId?: string;
  categoryIds?: string[];
  productIds?: string[];
  customerIds?: string[];
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Fetches a single coupon by its `code` field from
 * workspaces/{workspaceId}/loyaltyCoupons.
 */
export async function getCouponByCode(
  workspaceId: string,
  code: string,
): Promise<{ success: boolean; coupon?: PosCoupon | null; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'loyaltyCoupons');
    const q = query(colRef, where('code', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return { success: true, coupon: null };
    const doc = snap.docs[0];
    return { success: true, coupon: { id: doc.id, ...doc.data() } as PosCoupon };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to fetch coupon' };
  }
}

/**
 * Increments usedCount by 1 on a coupon document.
 * Fire-and-forget friendly — caller should not block on failure.
 */
export async function incrementCouponUsage(
  workspaceId: string,
  couponId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'loyaltyCoupons', couponId);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      usedCount: increment(1),
      updatedAt: now,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to increment coupon usage' };
  }
}

// ═══════════════════════════════════════════════════════════
//  customers
// ═══════════════════════════════════════════════════════════

export interface PosCustomer {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  customerType?: string;      // 'General' | 'VIP' etc.
  status?: string;            // 'Active' | 'Inactive' | 'Blocked'
  walletDue?: number;         // outstanding (from the website's normalizeCustomer)
  walletCredit?: number;      // prepaid credit
  lifetimeSpend?: number;
  posOrdersCount?: number;
  lastPosOrderAt?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // For local compatibility until full migration
  wallet?: number;
  dues?: number;
  creditLimit?: number;
  totalSpent?: number;
  visits?: number;
  lastVisit?: string;
  address?: string;
}

export async function listCustomers(
  workspaceId: string,
  searchTerm?: string,
): Promise<{ success: boolean; customers?: PosCustomer[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'customers');
    const q = query(colRef, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    let customers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PosCustomer));

    // Client-side search filter (Firestore doesn't support full-text search easily)
    if (searchTerm && searchTerm.trim()) {
      const qs = searchTerm.trim().toLowerCase();
      customers = customers.filter((c) =>
        (c.name || '').toLowerCase().includes(qs) ||
        (c.phone || '').includes(searchTerm.trim()) ||
        (c.email || '').toLowerCase().includes(qs),
      );
    }
    return { success: true, customers };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to list customers' };
  }
}

export async function createCustomer(
  workspaceId: string,
  data: PosCustomer,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'customers');
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...data,
      status: data.status || 'Active',
      customerType: data.customerType || 'General',
      walletDue: data.walletDue ?? data.dues ?? 0,
      walletCredit: data.walletCredit ?? data.wallet ?? 0,
      lifetimeSpend: data.lifetimeSpend ?? data.totalSpent ?? 0,
      posOrdersCount: 0,
      ...safeWriteFields(workspaceId),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create customer' };
  }
}

export async function updateCustomer(
  workspaceId: string,
  customerId: string,
  updates: Partial<PosCustomer>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = wDoc(workspaceId, 'customers', customerId);
    const now = new Date().toISOString();
    await updateDoc(docRef, { ...updates, updatedAt: now });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to update customer' };
  }
}

// ═══════════════════════════════════════════════════════════
//  expenses
// ═══════════════════════════════════════════════════════════
//
// Collection: workspaces/{workspaceId}/expenses
//
// IMPORTANT — desktop (cashier) can only:
//   - list expenses (read)
//   - create expenses with status/approvalStatus/requiresApproval
//     ALWAYS forced to 'pending' / 'pending' / true
//
// The website's Approval Center sets: approvedBy, approvedAt,
// rejectedBy, rejectedAt, paymentStatus, updatedAt.
// NEVER set these from the desktop.

export interface PosExpense {
  id?: string;
  title: string;
  category: string;           // Office, Salary, Fuel, Marketing, Software, Maintenance, Travel, Other
  amount: number;
  currency: string;           // default 'PKR'
  paymentMethod: string;      // Cash, Bank Transfer, Card, Wallet, Cheque, Other
  paidBy: string;
  status: string;             // ALWAYS 'pending' on create — website approval workflow controls this
  approvalStatus: string;     // ALWAYS 'pending' on create
  requiresApproval: boolean;  // ALWAYS true on create
  notes?: string;
  receiptReference?: string;
  // Read-only fields set by website approval flow — never sent by desktop
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  paymentStatus?: string;
  paidAt?: string;
  createdBy: string;
  workspaceId: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * List expenses for a workspace, ordered by createdAt descending.
 */
export async function listExpenses(
  workspaceId: string,
): Promise<{ success: boolean; expenses?: PosExpense[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'expenses');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PosExpense));
    return { success: true, expenses };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to list expenses' };
  }
}

/**
 * Create an expense. Forces status/approvalStatus/requiresApproval to
 * pending defaults regardless of what the caller passes — the desktop
 * must NEVER submit a pre-approved expense.
 */
/**
 * Strip keys whose value is undefined — Firestore's setDoc() rejects
 * { notes: undefined } with "Unsupported field value: undefined".
 */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result as Partial<T>;
}

export async function createExpense(
  workspaceId: string,
  data: PosExpense,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'expenses');
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...stripUndefined(data as unknown as Record<string, unknown>),
      // FORCE pending defaults regardless of caller input
      status: 'pending',
      approvalStatus: 'pending',
      requiresApproval: true,
      businessType: 'Restaurant POS',
      // NEVER set paymentStatus/approvedBy/approvedAt/rejectedBy/rejectedAt/paidAt here
      ...safeWriteFields(workspaceId),
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to create expense' };
  }
}

// ═══════════════════════════════════════════════════════════
//  walletTransactions — immutable append-only ledger
// ═══════════════════════════════════════════════════════════
//
// Collection: workspaces/{workspaceId}/customers/{customerId}/walletTransactions
//
// Rules:
//   - Any authenticated staff can READ transactions
//   - Cashier can CREATE only debit with source='order_payment'
//   - Owner/admin can CREATE credit (top-up) or debit (due_settlement/refund)
//   - All transactions are immutable — no update/delete from desktop

export interface WalletTransactionData {
  type: 'credit' | 'debit';
  amount: number;
  source: string;         // 'manual_topup' | 'due_settlement' | 'order_payment' | 'refund'
  sourceId?: string;      // order number, invoice ref, etc.
  note?: string;
  createdBy: string;
  createdAt?: string;
}

/**
 * Lightweight customer wallet summary for the Wallet screen list.
 */
export interface CustomerWalletInfo {
  id: string;
  name: string;
  phone: string;
  walletCredit: number;
  walletDue: number;
}

/**
 * List customers with their walletCredit/walletDue fields.
 */
export async function listCustomersWithWallets(
  workspaceId: string,
): Promise<{ success: boolean; customers?: CustomerWalletInfo[]; error?: string }> {
  try {
    const colRef = wCol(workspaceId, 'customers');
    const q = query(colRef, orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const customers = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Unknown',
        phone: data.phone || '',
        walletCredit: data.walletCredit ?? 0,
        walletDue: data.walletDue ?? 0,
      } as CustomerWalletInfo;
    });
    return { success: true, customers };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to list customers' };
  }
}

/**
 * List wallet transactions for a customer, ordered by createdAt desc.
 */
export async function listWalletTransactions(
  workspaceId: string,
  customerId: string,
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    const colRef = collection(db(), 'workspaces', workspaceId, 'customers', customerId, 'walletTransactions');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    const transactions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, transactions };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to list wallet transactions' };
  }
}

/**
 * Add a wallet transaction AND atomically update the customer's walletCredit/walletDue
 * inside a single Firestore transaction (runTransaction), preventing race conditions.
 *
 * - Credit: increases walletCredit
 * - Debit (due_settlement): decreases walletDue
 * - Debit (order_payment): decreases walletCredit — rejects if insufficient balance
 */
export async function addWalletTransaction(
  workspaceId: string,
  customerId: string,
  data: { type: 'credit' | 'debit'; amount: number; source: string; sourceId?: string; note?: string },
): Promise<{ success: boolean; id?: string; newWalletCredit?: number; newWalletDue?: number; error?: string }> {
  try {
    const customerRef = wDoc(workspaceId, 'customers', customerId);
    const txColRef = collection(db(), 'workspaces', workspaceId, 'customers', customerId, 'walletTransactions');

    const result = await runTransaction(db(), async (transaction) => {
      // Read current customer snapshot
      const custSnap = await transaction.get(customerRef);
      if (!custSnap.exists()) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const custData = custSnap.data();
      const currentCredit: number = custData.walletCredit ?? 0;
      const currentDue: number = custData.walletDue ?? 0;

      let newWalletCredit = currentCredit;
      let newWalletDue = currentDue;

      if (data.type === 'credit') {
        // Top-up: add to walletCredit
        newWalletCredit = currentCredit + data.amount;
      } else if (data.source === 'due_settlement') {
        // Settle a due: reduce walletDue (can't go below 0)
        if (data.amount > currentDue) {
          throw new Error(`Settlement amount (${data.amount}) exceeds outstanding due (${currentDue})`);
        }
        newWalletDue = currentDue - data.amount;
      } else {
        // Debit from wallet (order_payment, refund, etc.): reduce walletCredit
        if (data.amount > currentCredit) {
          throw new Error(`Insufficient wallet balance: need ${data.amount}, have ${currentCredit}`);
        }
        newWalletCredit = currentCredit - data.amount;
      }

      // Create the transaction document
      const txDocRef = doc(txColRef);
      const now = new Date().toISOString();
      const txData: Record<string, unknown> = {
        type: data.type,
        amount: data.amount,
        source: data.source,
        createdBy: currentUserId(),
        workspaceId,
        createdAt: now,
        balanceBefore: currentCredit,
        balanceAfter: newWalletCredit,
        dueBefore: currentDue,
        dueAfter: newWalletDue,
      };
      if (data.sourceId) txData.sourceId = data.sourceId;
      if (data.note) txData.note = data.note;

      transaction.set(txDocRef, txData);

      // Atomically update the customer document
      const customerUpdate: Record<string, unknown> = {
        walletCredit: newWalletCredit,
        walletDue: newWalletDue,
        updatedAt: now,
      };
      // For credit operations, update lifetimeSpend = 0 (initial)
      // For debit operations, increment lifetimeSpend
      if (data.type === 'debit' && data.source === 'order_payment') {
        customerUpdate.lifetimeSpend = increment(data.amount);
        customerUpdate.posOrdersCount = increment(1);
        customerUpdate.lastPosOrderAt = now;
      }
      transaction.update(customerRef, customerUpdate);

      return { id: txDocRef.id, newWalletCredit, newWalletDue };
    });

    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to add wallet transaction' };
  }
}
