/**
 * sync-drain.ts — Offline-first sync drain engine.
 *
 * Runs in the Electron main process (not the renderer), so it keeps working
 * regardless of which screen is open.
 *
 * Responsibilities:
 *   1. Network monitoring — periodic Firestore reachability probe
 *   2. Drain loop — processes sync_queue entries in FIFO order
 *   3. Retry with exponential backoff
 *   4. Idempotent replay (orders use setDoc on orderNumber, payments use PMT- prefix)
 *   5. Ordering — orders are replayed before payments within the same batch
 */

import { BrowserWindow } from 'electron';

// ── State ──

let drainTimer: ReturnType<typeof setTimeout> | null = null;
let drainInterval: ReturnType<typeof setInterval> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let online = false;
let draining = false;
let lastSyncResult: SyncResult = { completed: 0, failed: 0, stuck: 0 };

interface SyncResult { completed: number; failed: number; stuck: number; }

// ── Config ──

const PING_INTERVAL_MS = 30_000;       // How often to check Firestore reachability
const DRAIN_INTERVAL_MS = 45_000;      // How often to drain (when online)
const MAX_RETRY_ATTEMPTS = 10;          // After this many failures, mark as stuck
const BASE_BACKOFF_MS = 5_000;          // Initial backoff (doubles each retry)

// ── Firestore Ping ──

async function pingFirestore(): Promise<boolean> {
  try {
    const { getFirebaseFirestore, getFirebaseAuth } = await import('../firebase/config');
    const { doc, getDoc } = await import('firebase/firestore');
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return false;
    // Lightweight: fetch a non-existent doc — if we get a response (even "not found"),
    // Firestore is reachable. If the network is down, this will hang briefly then throw.
    const db = getFirebaseFirestore();
    const probeRef = doc(db, '_sync_probe_/ping');
    const result = await Promise.race([
      getDoc(probeRef),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('PING_TIMEOUT')), 8_000)),
    ]);
    // Either "exists" or "doesn't exist" — both mean Firestore is reachable
    return true;
  } catch {
    return false;
  }
}

// ── Network Monitor ──

async function checkConnectivity(): Promise<void> {
  const wasOnline = online;
  const nowOnline = await pingFirestore();
  online = nowOnline;

  if (!wasOnline && nowOnline) {
    console.log('[SyncDrain] Connectivity RESTORED — triggering drain');
    drainQueue();
  }
  if (wasOnline && !nowOnline) {
    console.log('[SyncDrain] Connectivity LOST');
  }
}

function startNetworkMonitor(): void {
  checkConnectivity();
  pingTimer = setInterval(checkConnectivity, PING_INTERVAL_MS);
}

// ── Drain Engine ──

async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    const { getDatabase } = await import('../database/connection');
    const db = getDatabase();

    // Fetch processable entries in FIFO order, oldest first. Failed rows still
    // inside their exponential backoff window are excluded in SQL so they don't
    // consume the LIMIT and starve newer orders.
    const backoffOk: string[] = [];
    for (let r = 1; r < MAX_RETRY_ATTEMPTS; r++) {
      const delayMs = BASE_BACKOFF_MS * Math.pow(2, r - 1);
      const cutoff = new Date(Date.now() - delayMs).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
      backoffOk.push(`(retry_count = ${r} AND updated_at <= '${cutoff}')`);
    }

    const entries = db.prepare(
      `SELECT * FROM sync_queue
       WHERE status = 'pending'
          OR (status = 'failed' AND retry_count >= ${MAX_RETRY_ATTEMPTS})
          OR (status = 'failed' AND (${backoffOk.join(' OR ')}))
       ORDER BY created_at ASC
       LIMIT 20`
    ).all() as SyncQueueRow[];

    if (entries.length === 0) {
      lastSyncResult = { completed: 0, failed: 0, stuck: 0 };
      notifyRenderer({ ...lastSyncResult, total: 0 });
      return;
    }

    console.log(`[SyncDrain] Processing ${entries.length} entries`);

    // Sort: order entries first, then payments (dependency ordering)
    const orderEntries = entries.filter((e) => e.entity_type === 'order');
    const otherEntries = entries.filter((e) => e.entity_type !== 'order');
    const sorted = [...orderEntries, ...otherEntries];

    let completed = 0;
    let failed = 0;
    let stuck = 0;

    for (const entry of sorted) {
      try {
        // Retries exhausted → mark as conflict (needs human attention).
        if (entry.status === 'failed' && entry.retry_count >= MAX_RETRY_ATTEMPTS) {
          db.prepare(
            `UPDATE sync_queue SET status = 'conflict', updated_at = datetime('now') WHERE id = ?`
          ).run(entry.id);
          stuck++;
          continue;
        }

        // Mark as processing
        db.prepare(
          `UPDATE sync_queue SET status = 'processing', updated_at = datetime('now') WHERE id = ?`
        ).run(entry.id);

        const success = await replayEntry(entry);

        if (success) {
          db.prepare(
            `UPDATE sync_queue SET status = 'completed', updated_at = datetime('now') WHERE id = ?`
          ).run(entry.id);
          completed++;
        } else {
          db.prepare(
            `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1,
             last_error = 'Firestore write failed', updated_at = datetime('now') WHERE id = ?`
          ).run(entry.id);
          failed++;
        }
      } catch (err: any) {
        db.prepare(
          `UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1,
           last_error = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(err.message ?? 'Unknown error', entry.id);
        failed++;
      }
    }

    lastSyncResult = { completed, failed, stuck };
    notifyRenderer({ ...lastSyncResult, total: entries.length });

    // Clean up old completed entries (keep last 7 days)
    db.prepare(
      `DELETE FROM sync_queue WHERE status = 'completed' AND updated_at < datetime('now', '-7 days')`
    ).run();

    console.log(`[SyncDrain] Done — ${completed} ok, ${failed} failed, ${stuck} stuck`);
  } catch (err) {
    console.error('[SyncDrain] Drain cycle error:', err);
  } finally {
    draining = false;
  }
}

// ── Entry Replay ──

async function replayEntry(entry: SyncQueueRow): Promise<boolean> {
  const payload = JSON.parse(entry.payload || '{}');

  if (entry.entity_type === 'order') {
    return replayOrder(payload, entry.operation);
  }

  // Unknown entity type — skip
  console.warn(`[SyncDrain] Unknown entity type: ${entry.entity_type}`);
  return true; // mark as completed so it doesn't block the queue
}

async function replayOrder(payload: Record<string, unknown>, operation: string): Promise<boolean> {
  const { getFirebaseFirestore, getFirebaseAuth } = await import('../firebase/config');
  const { doc, setDoc } = await import('firebase/firestore');
  const auth = getFirebaseAuth();
  if (!auth.currentUser) {
    // Can't write to Firestore without auth — leave in queue
    return false;
  }

  const workspaceId = (payload.workspaceId as string) || 'default';
  const orderNumber = (payload.orderNumber as string) || 'unknown';
  const now = new Date().toISOString();
  const isUpdate = operation === 'update';

  // Safety: an update that can't resolve its target document is a
  // misconfigured sync entry — skip it rather than writing to a phantom
  // "workspaces/default/orders/unknown" document.
  if (isUpdate && (!payload.workspaceId || !payload.orderNumber)) {
    console.warn(`[SyncDrain] Skipping update for order — missing workspaceId or orderNumber in payload. entity_id=${orderNumber}`);
    return true; // mark completed — we can't replay it, and retrying won't help
  }

  try {
    const db = getFirebaseFirestore();

    // ── 1. Write the order document ──
    const orderRef = doc(db, 'workspaces', workspaceId, 'orders', orderNumber);

    if (isUpdate) {
      // Partial merge: only update fields present in the payload.
      // Prevents overwriting the entire document with a sparse update
      // payload (e.g. a cancellation only sets orderStatus + cancelReason
      // and must not wipe cartRows, totals, customer, etc.).
      await setDoc(orderRef, {
        ...payload,
        updatedAt: now,
      }, { merge: true });
    } else {
      // Full create: the payload is a complete PosOrder document from
      // LOCAL_ORDER_WRITE — write it as-is (idempotent via doc ID).
      await setDoc(orderRef, {
        ...payload,
        workspaceId,
        createdBy: auth.currentUser.uid,
        ownerId: workspaceId,
        createdAt: payload.createdAt || now,
        updatedAt: now,
      }, { merge: true });
    }

    // ── 2. Payment & coupon replay — only for full-order creates ──
    // Update payloads (cancellation, status change) should NOT create
    // a new payment document or increment coupon usage.
    if (!isUpdate) {
      // Only write a payment when the order was actually paid — unpaid KOT
      // orders must not invent a 'paid' payment document.
      if (payload.paymentStatus === 'paid') {
        const paymentId = `PMT-${orderNumber}`;
        const paymentRef = doc(db, 'workspaces', workspaceId, 'restaurantPayments', paymentId);
        await setDoc(paymentRef, {
          orderId: orderNumber,
          amountCents: Math.round(((payload.total as number) || 0) * 100),
          method: (payload.paymentMethod as string) || 'Cash',
          status: 'paid',
          processedBy: (payload.createdBy as string) || auth.currentUser.uid,
          tipCents: 0,
          reference: orderNumber,
          notes: `${(payload.orderType as string) || 'Order'} — ${(payload.customer as string) || 'Walk-in Guest'}`,
          workspaceId,
          createdBy: auth.currentUser.uid,
          ownerId: workspaceId,
          createdAt: now,
          updatedAt: now,
        });
      }

      // ── 3. Increment coupon usage if applicable ──
      const couponId = payload.couponId as string | undefined;
      if (couponId) {
        try {
          const { increment, updateDoc } = await import('firebase/firestore');
          const couponRef = doc(db, 'workspaces', workspaceId, 'loyaltyCoupons', couponId);
          await updateDoc(couponRef, { usedCount: increment(1), updatedAt: now });
        } catch { /* non-critical — coupon tracking is best-effort */ }
      }
    }

    return true;
  } catch (err: any) {
    console.warn(`[SyncDrain] Order replay failed for ${orderNumber}:`, err.message);
    return false;
  }
}

// ── Renderer Notification ──

function notifyRenderer(result: SyncResult & { total: number }): void {
  try {
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      if (!win.isDestroyed()) {
        win.webContents.send('sync:result', result);
      }
    }
  } catch { /* non-critical */ }
}

// ── Types ──

interface SyncQueueRow {
  id: number;
  workspace_id: string;
  branch_id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  retry_count: number;
  created_at: string;
  updated_at: string;
  last_error: string | null;
}

// ── Public API ──

export function startSyncDrain(): void {
  console.log('[SyncDrain] Starting sync drain engine');

  // Recover rows left in 'processing' by a crash mid-drain before the first cycle.
  import('../database/connection')
    .then(({ getDatabase }) => {
      getDatabase().prepare("UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'").run();
    })
    .catch((err) => console.error('[SyncDrain] Failed to reset processing rows:', err));

  startNetworkMonitor();
  // Initial drain on startup
  drainTimer = setTimeout(drainQueue, 3_000);

  // Periodic drain (safety net — also triggered by connectivity restored)
  drainInterval = setInterval(() => {
    if (online) drainQueue();
  }, DRAIN_INTERVAL_MS);
}

export function stopSyncDrain(): void {
  if (drainTimer) { clearTimeout(drainTimer); drainTimer = null; }
  if (drainInterval) { clearInterval(drainInterval); drainInterval = null; }
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
}

export function getSyncState() {
  return { online, lastSyncResult, draining };
}

export function triggerDrain(): void {
  drainQueue();
}
