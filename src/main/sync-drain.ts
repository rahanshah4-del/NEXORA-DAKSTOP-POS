/**
 * sync-drain.ts — Offline-first sync drain engine.
 *
 * Runs in the Electron main process (not the renderer), so it keeps working
 * regardless of which screen is open.
 *
 * Responsibilities:
 *   1. Lifecycle — the drain loop only runs while a Firebase session exists.
 *      It is armed by startSyncDrain() and started/stopped by auth state.
 *   2. Connectivity — Electron's net.isOnline(); no Firestore read is used as
 *      a probe (the old `_sync_probe_/ping` doc has no security rule).
 *   3. Drain loop — processes sync_queue entries in FIFO order, in repeated
 *      batches within one cycle so newer rows can never be starved by a
 *      permanently-failing prefix.
 *   4. Retry with exponential backoff; real Firestore errors are persisted.
 *   5. Safe replay — supersede stale duplicates, defer updates until their
 *      create lands, and never overwrite a Firestore doc that is newer than
 *      the queued row.
 */

import { BrowserWindow, net } from 'electron';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { loadStaffProfile } from '../firebase/token-store';
import type Database from 'better-sqlite3';

// ── State ──

let drainInterval: ReturnType<typeof setInterval> | null = null;
let netTimer: ReturnType<typeof setInterval> | null = null;
let authUnsub: (() => void) | null = null;

let signedIn = false;
let online = false;
let draining = false;
let lastSyncResult: SyncResult = { completed: 0, failed: 0, stuck: 0 };

interface SyncResult { completed: number; failed: number; stuck: number; }

// ── Config ──

const NET_CHECK_INTERVAL_MS = 30_000;  // How often to poll net.isOnline()
const DRAIN_INTERVAL_MS = 45_000;      // How often to drain (signed in + online)
const MAX_RETRY_ATTEMPTS = 10;         // After this many failures, mark as stuck
const BASE_BACKOFF_MS = 5_000;         // Initial backoff (doubles each retry)
const BATCH_SIZE = 50;                 // Rows fetched per batch
const CYCLE_BUDGET_MS = 20_000;        // Wall-clock budget for one drain cycle
const MAX_ERROR_LEN = 500;             // last_error is truncated to this

const NOTE_SUPERSEDED = 'superseded by newer queue row';
const NOTE_ALREADY_NEWER = 'skipped: Firestore already newer';

/**
 * Firestore error codes where retrying cannot help — these go straight to
 * 'conflict' instead of burning ten backoff cycles first.
 */
const NON_RETRYABLE_CODES = new Set([
  'permission-denied',
  'invalid-argument',
  'not-found',
  'already-exists',
  'failed-precondition',
  'out-of-range',
  'unimplemented',
  'data-loss',
]);

// ── Replay outcome ──

/** Why a row was left untouched. 'foreign-owner' rows are counted per cycle. */
type DeferReason = 'no-session' | 'foreign-owner';

type ReplayOutcome =
  /** Row is done. `note` (when present) is recorded in last_error as the reason. */
  | { ok: true; note?: string }
  /** Leave the row exactly as it was: no status change, no retry_count bump. */
  | { ok: false; defer: true; reason: DeferReason; error?: undefined; retryable?: undefined }
  /** Real failure — persist the error. retryable=false sends it to 'conflict'. */
  | { ok: false; defer?: false; error: string; retryable: boolean };

// ── Signed-in session context ──

/**
 * Who the drain is currently acting as.
 *
 * `workspaceId` comes from the safeStorage-persisted staff profile, which is
 * written at login (ipc-handlers.ts:164 for owner email login, :209 for staff
 * PIN login). That file outlives the session it belongs to and — because
 * staffPinLogin() establishes the Firebase session *before* the profile is
 * saved — can still hold the previous user during the first drain after a
 * login. So it is only trusted when its staffUid matches the live uid;
 * otherwise workspaceId is null and only uid matching is applied.
 */
interface SessionContext {
  uid: string;
  workspaceId: string | null;
}

function resolveSessionContext(uid: string): SessionContext {
  try {
    const profile = loadStaffProfile();
    if (profile && profile.staffUid === uid && profile.workspaceId) {
      return { uid, workspaceId: profile.workspaceId };
    }
    if (profile && profile.staffUid !== uid) {
      console.warn(
        `[SyncDrain] Persisted staff profile is for ${profile.staffUid} but the live session is ${uid} — falling back to uid-only ownership checks`
      );
    }
  } catch (err) {
    console.warn('[SyncDrain] Could not read the persisted staff profile:', err);
  }
  return { uid, workspaceId: null };
}

// ── Time helpers ──

/**
 * SQLite `datetime('now')` produces 'YYYY-MM-DD HH:MM:SS' in **UTC** with no
 * zone marker, which Date.parse would otherwise read as local time.
 */
function sqliteUtcToMillis(value: string | null | undefined): number | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone = /([Zz]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const ms = Date.parse(withZone);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * A Firestore field may come back as a Timestamp, a Date, an ISO string or an
 * epoch number (seconds or milliseconds). Returns null when it is none of those.
 */
function anyToMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Heuristic: anything below ~2001 in ms is far more likely to be seconds.
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') {
      try {
        const ms = (obj.toMillis as () => number)();
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    const seconds =
      typeof obj.seconds === 'number' ? obj.seconds
      : typeof obj._seconds === 'number' ? obj._seconds
      : null;
    if (seconds !== null) {
      const nanos =
        typeof obj.nanoseconds === 'number' ? obj.nanoseconds
        : typeof obj._nanoseconds === 'number' ? obj._nanoseconds
        : 0;
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return null;
}

// ── Error helpers ──

function describeError(err: unknown): { error: string; retryable: boolean } {
  const e = err as { code?: unknown; name?: unknown; message?: unknown } | null | undefined;
  const rawCode =
    typeof e?.code === 'string' ? e.code
    : typeof e?.name === 'string' ? e.name
    : 'unknown';
  const code = rawCode.replace(/^firestore\//, '');
  const message = typeof e?.message === 'string' ? e.message : String(err);
  return {
    error: `${code}: ${message}`.slice(0, MAX_ERROR_LEN),
    retryable: !NON_RETRYABLE_CODES.has(code),
  };
}

// ── Network Monitor ──

function checkConnectivity(): void {
  const wasOnline = online;
  online = net.isOnline();

  if (!wasOnline && online) {
    console.log('[SyncDrain] Connectivity RESTORED');
    if (signedIn) void drainQueue('connectivity-restored');
  } else if (wasOnline && !online) {
    console.log('[SyncDrain] Connectivity LOST');
  }
}

// ── Lifecycle (driven by auth state) ──

function startLoops(): void {
  if (!drainInterval) {
    drainInterval = setInterval(() => {
      if (signedIn && net.isOnline()) void drainQueue('interval');
    }, DRAIN_INTERVAL_MS);
  }
  if (!netTimer) {
    netTimer = setInterval(checkConnectivity, NET_CHECK_INTERVAL_MS);
  }
}

function stopLoops(): void {
  if (drainInterval) { clearInterval(drainInterval); drainInterval = null; }
  if (netTimer) { clearInterval(netTimer); netTimer = null; }
}

function handleSignedIn(uid: string): void {
  // onAuthStateChanged also fires on token refresh — only react to transitions.
  if (signedIn) return;
  signedIn = true;
  online = net.isOnline();
  console.log(`[SyncDrain] Signed in (uid=${uid}) — starting drain loop (online=${online})`);
  startLoops();
  if (online) {
    void drainQueue('sign-in');
  } else {
    console.log('[SyncDrain] Offline at sign-in — waiting for connectivity');
  }
}

function handleSignedOut(): void {
  if (!signedIn) return;
  signedIn = false;
  console.log('[SyncDrain] Signed out — stopping drain loop');
  stopLoops();
}

// ── Drain Engine ──

/**
 * Rows eligible for this cycle: everything pending, plus failed rows whose
 * exponential backoff window has elapsed, plus failed rows that have exhausted
 * their retries (so they can be promoted to 'conflict').
 */
function buildEligibilityClause(): string {
  const backoffOk: string[] = [];
  for (let r = 1; r < MAX_RETRY_ATTEMPTS; r++) {
    const delayMs = BASE_BACKOFF_MS * Math.pow(2, r - 1);
    const cutoff = new Date(Date.now() - delayMs).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    backoffOk.push(`(retry_count = ${r} AND updated_at <= '${cutoff}')`);
  }
  return `status = 'pending'
          OR (status = 'failed' AND retry_count >= ${MAX_RETRY_ATTEMPTS})
          OR (status = 'failed' AND (${backoffOk.join(' OR ')}))`;
}

/** Is there a newer, not-yet-completed create row for the same order? */
function hasNewerOpenCreate(db: Database.Database, entry: SyncQueueRow): boolean {
  const row = db.prepare(
    `SELECT COUNT(*) AS cnt FROM sync_queue
      WHERE entity_type = 'order'
        AND entity_id = ?
        AND operation = 'create'
        AND status != 'completed'
        AND (created_at > ? OR (created_at = ? AND id > ?))`
  ).get(entry.entity_id, entry.created_at, entry.created_at, entry.id) as { cnt: number } | undefined;
  return (row?.cnt ?? 0) > 0;
}

/** Is there any not-yet-completed create row for the same order? */
function hasOpenCreate(db: Database.Database, entry: SyncQueueRow): boolean {
  const row = db.prepare(
    `SELECT COUNT(*) AS cnt FROM sync_queue
      WHERE entity_type = 'order'
        AND entity_id = ?
        AND operation = 'create'
        AND status != 'completed'`
  ).get(entry.entity_id) as { cnt: number } | undefined;
  return (row?.cnt ?? 0) > 0;
}

type EntryResult = 'completed' | 'failed' | 'stuck' | 'deferred' | 'deferred-foreign';

async function processEntry(
  db: Database.Database,
  entry: SyncQueueRow,
  session: SessionContext,
): Promise<EntryResult> {
  // Retries exhausted → mark as conflict (needs human attention).
  if (entry.status === 'failed' && entry.retry_count >= MAX_RETRY_ATTEMPTS) {
    db.prepare(
      `UPDATE sync_queue SET status = 'conflict', updated_at = datetime('now') WHERE id = ?`
    ).run(entry.id);
    console.warn(`[SyncDrain] ${entry.entity_id} (id=${entry.id}): retries exhausted → conflict`);
    return 'stuck';
  }

  if (entry.entity_type === 'order') {
    // (a) Coalescing — a newer create for the same order makes this one stale.
    if (entry.operation === 'create' && hasNewerOpenCreate(db, entry)) {
      db.prepare(
        `UPDATE sync_queue SET status = 'completed', last_error = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(NOTE_SUPERSEDED, entry.id);
      console.log(`[SyncDrain] ${entry.entity_id} (id=${entry.id}): ${NOTE_SUPERSEDED}`);
      return 'completed';
    }

    // (b) An update must not land before the create it depends on.
    if (entry.operation === 'update' && hasOpenCreate(db, entry)) {
      console.log(`[SyncDrain] ${entry.entity_id} (id=${entry.id}): deferring update — create row not completed yet`);
      return 'deferred';
    }
  }

  // Snapshot so a deferral can restore the row exactly as it was.
  const before = {
    status: entry.status,
    retry_count: entry.retry_count,
    last_error: entry.last_error,
    updated_at: entry.updated_at,
  };

  db.prepare(
    `UPDATE sync_queue SET status = 'processing', updated_at = datetime('now') WHERE id = ?`
  ).run(entry.id);

  let outcome: ReplayOutcome;
  try {
    outcome = await replayEntry(entry, session);
  } catch (err) {
    outcome = { ok: false, ...describeError(err) };
  }

  if (outcome.ok) {
    if (outcome.note) {
      db.prepare(
        `UPDATE sync_queue SET status = 'completed', last_error = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(outcome.note, entry.id);
    } else {
      db.prepare(
        `UPDATE sync_queue SET status = 'completed', last_error = NULL, updated_at = datetime('now') WHERE id = ?`
      ).run(entry.id);
    }
    return 'completed';
  }

  if (outcome.defer === true) {
    db.prepare(
      `UPDATE sync_queue SET status = ?, retry_count = ?, last_error = ?, updated_at = ? WHERE id = ?`
    ).run(before.status, before.retry_count, before.last_error, before.updated_at, entry.id);
    return outcome.reason === 'foreign-owner' ? 'deferred-foreign' : 'deferred';
  }

  // Real failure — persist the actual Firestore code + message.
  const nextStatus = outcome.retryable ? 'failed' : 'conflict';
  db.prepare(
    `UPDATE sync_queue SET status = ?, retry_count = retry_count + 1, last_error = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(nextStatus, outcome.error.slice(0, MAX_ERROR_LEN), entry.id);
  console.warn(`[SyncDrain] ${entry.entity_id} (id=${entry.id}) → ${nextStatus}: ${outcome.error}`);
  return nextStatus === 'conflict' ? 'stuck' : 'failed';
}

async function drainQueue(reason: string): Promise<void> {
  if (draining) {
    console.log(`[SyncDrain] Drain already in flight — skipping trigger '${reason}'`);
    return;
  }

  // No session → skip the whole cycle WITHOUT touching a single row.
  const { getFirebaseAuth } = await import('../firebase/config');
  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    console.log(`[SyncDrain] No Firebase session — skipping cycle '${reason}' (no rows touched)`);
    return;
  }

  // Resolved once per cycle: every ownership decision below is made against
  // the user who is signed in right now.
  const session = resolveSessionContext(currentUser.uid);

  draining = true;
  const deadline = Date.now() + CYCLE_BUDGET_MS;
  let completed = 0;
  let failed = 0;
  let stuck = 0;
  let deferred = 0;
  let deferredForeign = 0;
  let total = 0;

  try {
    const { getDatabase } = await import('../database/connection');
    const db = getDatabase();

    // Rows already handled in this cycle are excluded from later batches, so a
    // batch of deferrals can never re-appear and spin the loop forever.
    const handled: number[] = [];
    let batchNo = 0;
    let budgetHit = false;

    while (Date.now() < deadline) {
      const exclude = handled.length ? ` AND id NOT IN (${handled.join(',')})` : '';
      const batch = db.prepare(
        `SELECT * FROM sync_queue
          WHERE (${buildEligibilityClause()})${exclude}
          ORDER BY created_at ASC, id ASC
          LIMIT ${BATCH_SIZE}`
      ).all() as SyncQueueRow[];

      if (batch.length === 0) break;

      batchNo++;
      total += batch.length;
      console.log(`[SyncDrain] Batch ${batchNo}: ${batch.length} row(s)`);

      for (const entry of batch) {
        if (Date.now() >= deadline) {
          budgetHit = true;
          break;
        }
        // Pushed before processing, so both kinds of deferral are excluded
        // from every later batch in this cycle and cannot spin the loop.
        handled.push(entry.id);
        const result = await processEntry(db, entry, session);
        if (result === 'completed') completed++;
        else if (result === 'failed') failed++;
        else if (result === 'stuck') stuck++;
        else if (result === 'deferred-foreign') deferredForeign++;
        else deferred++;
      }

      if (budgetHit) break;
    }

    if (budgetHit || Date.now() >= deadline) {
      console.warn(`[SyncDrain] Cycle time budget (${CYCLE_BUDGET_MS} ms) reached — remaining rows stay queued for the next cycle`);
    }

    // One summary line per cycle instead of a log per row.
    if (deferredForeign > 0) {
      console.log(
        `[sync] deferred ${deferredForeign} rows belonging to another user/workspace ` +
        `(signed in as uid=${session.uid}, workspaceId=${session.workspaceId ?? 'unknown'})`
      );
    }

    lastSyncResult = { completed, failed, stuck };
    notifyRenderer({ ...lastSyncResult, total });

    // Clean up old completed entries (keep last 7 days)
    db.prepare(
      `DELETE FROM sync_queue WHERE status = 'completed' AND updated_at < datetime('now', '-7 days')`
    ).run();

    console.log(
      `[SyncDrain] Cycle '${reason}' done — ${completed} ok, ${failed} failed, ${stuck} stuck, ${deferred} deferred, ${deferredForeign} foreign (of ${total} seen)`
    );
  } catch (err) {
    console.error('[SyncDrain] Drain cycle error:', err);
  } finally {
    draining = false;
  }
}

// ── Entry Replay ──

async function replayEntry(entry: SyncQueueRow, session: SessionContext): Promise<ReplayOutcome> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(entry.payload || '{}') as Record<string, unknown>;
  } catch (err) {
    // A payload that will never parse is terminal — retrying cannot help.
    return { ok: false, error: describeError(err).error, retryable: false };
  }

  if (entry.entity_type === 'order') {
    return replayOrder(payload, entry.operation, sqliteUtcToMillis(entry.created_at), session);
  }

  // TODO(sync): there is NO replay implementation for any non-order entity type
  // ('payment', 'kitchen', 'inventory', 'settings', 'table', 'customer',
  // 'product', 'staff'). Rows of those types are marked completed here WITHOUT
  // ever being sent to Firestore — i.e. silently dropped. Behaviour is
  // intentionally left unchanged by this change; real handlers (or a hold
  // status) must be added before any repository that enqueues those types goes
  // live, otherwise their data is lost. See src/repositories/sqlite/*.ts.
  console.warn(`[SyncDrain] Unknown entity type: ${entry.entity_type}`);
  return { ok: true }; // mark as completed so it doesn't block the queue
}

async function replayOrder(
  payload: Record<string, unknown>,
  operation: string,
  rowCreatedAtMs: number | null,
  session: SessionContext,
): Promise<ReplayOutcome> {
  const { getFirebaseFirestore, getFirebaseAuth } = await import('../firebase/config');

  const currentUser = getFirebaseAuth().currentUser;
  if (!currentUser) {
    // Signed out mid-cycle. Not a failure — leave the row untouched.
    return { ok: false, defer: true, reason: 'no-session' };
  }

  const workspaceId = (payload.workspaceId as string) || 'default';
  const orderNumber = (payload.orderNumber as string) || 'unknown';
  const payloadCreatedBy = typeof payload.createdBy === 'string' ? payload.createdBy.trim() : '';
  const now = new Date().toISOString();
  const isUpdate = operation === 'update';

  // Safety: an update that can't resolve its target document is a
  // misconfigured sync entry — skip it rather than writing to a phantom
  // "workspaces/default/orders/unknown" document.
  if (isUpdate && (!payload.workspaceId || !payload.orderNumber)) {
    console.warn(`[SyncDrain] Skipping update for order — missing workspaceId or orderNumber in payload. entity_id=${orderNumber}`);
    return { ok: true, note: 'skipped: update payload missing workspaceId or orderNumber' };
  }

  // ── Ownership gate 1: a different workspace ──
  // On a shared terminal the queue outlives the user who filled it. A row for
  // another workspace is not ours to write and Firestore would reject it, so
  // hold it for whoever owns it rather than burning it into 'conflict'.
  if (session.workspaceId && workspaceId !== session.workspaceId) {
    return { ok: false, defer: true, reason: 'foreign-owner' };
  }

  try {
    const db = getFirebaseFirestore();

    // ── 1. Read the current Firestore state ──
    const orderRef = doc(db, 'workspaces', workspaceId, 'orders', orderNumber);
    const existing = await getDoc(orderRef);
    const remote = existing.exists() ? (existing.data() as Record<string, unknown>) : null;

    // Staleness guard: never push a queued row over a Firestore document that
    // has been written more recently (e.g. by Billing's STEP C checkout path).
    if (remote) {
      const remoteMs = anyToMillis(remote.updatedAt) ?? anyToMillis(remote.createdAt);
      if (remoteMs !== null && rowCreatedAtMs !== null && remoteMs > rowCreatedAtMs) {
        console.log(
          `[SyncDrain] ${orderNumber}: Firestore copy is newer (remote ${new Date(remoteMs).toISOString()} > queued ${new Date(rowCreatedAtMs).toISOString()}) — not writing`
        );
        return { ok: true, note: NOTE_ALREADY_NEWER };
      }
    }

    // ── Ownership gate 2: creating a document another user authored ──
    // safeCreate() demands createdBy == request.auth.uid, so a create for a
    // doc that does not exist yet can only be written by its own author.
    // Merging into an existing doc goes through safeUpdate(), which imposes no
    // such requirement — hence the `remote === null` condition. Reaching this
    // point also proves the signed-in user could read the path.
    if (!isUpdate && remote === null && payloadCreatedBy && payloadCreatedBy !== session.uid) {
      return { ok: false, defer: true, reason: 'foreign-owner' };
    }

    // ── 2. Build the body ──
    const body: Record<string, unknown> = { ...payload };

    // Never push an empty payment link over a real one (Billing STEP C-3).
    for (const key of ['lastPaymentId', 'lastPaymentAt'] as const) {
      const value = body[key];
      if (value === '' || value === null || value === undefined) delete body[key];
    }

    // ── 3. Write the order document ──
    if (isUpdate) {
      // Partial merge: only update fields present in the payload.
      // Prevents overwriting the entire document with a sparse update
      // payload (e.g. a cancellation only sets orderStatus + cancelReason
      // and must not wipe cartRows, totals, customer, etc.).
      await setDoc(orderRef, { ...body, updatedAt: now }, { merge: true });
    } else {
      // A createdBy that differs from the signed-in uid can only reach here for
      // a doc that already exists (ownership gate 2 defers the create case), so
      // this is a safeUpdate() merge and the queued author is preserved as-is.
      const fields: Record<string, unknown> = {
        ...body,
        workspaceId,
        // Preserve the cashier who actually took the order; only fall back to
        // the current session when the payload has no createdBy at all.
        createdBy: payloadCreatedBy || session.uid,
        ownerId: workspaceId,
        updatedAt: now,
      };

      // Only stamp createdAt when neither the payload nor the existing document
      // already has one — merging `now` over a real createdAt rewrites history.
      const payloadCreatedAt = payload.createdAt;
      if (payloadCreatedAt !== undefined && payloadCreatedAt !== null && payloadCreatedAt !== '') {
        fields.createdAt = payloadCreatedAt;
      } else if (remote === null || remote.createdAt === undefined || remote.createdAt === null) {
        fields.createdAt = now;
      }

      // Full create: the payload is a complete PosOrder document from
      // LOCAL_ORDER_WRITE — write it as-is (idempotent via doc ID).
      await setDoc(orderRef, fields, { merge: true });
    }

    // ── 4. Payment & coupon replay — only for full-order creates ──
    // Update payloads (cancellation, status change) should NOT create
    // a new payment document or increment coupon usage.
    if (!isUpdate) {
      // Only write a payment when the order was actually paid — unpaid KOT
      // orders must not invent a 'paid' payment document.
      if (payload.paymentStatus === 'paid') {
        const paymentId = `PMT-${orderNumber}`;
        const paymentRef = doc(db, 'workspaces', workspaceId, 'restaurantPayments', paymentId);
        const existingPayment = await getDoc(paymentRef);

        if (existingPayment.exists()) {
          // A payment document written by the checkout path is authoritative —
          // its amount may legitimately differ (e.g. a wallet/cash split).
          console.log(`[SyncDrain] ${paymentId} already exists — leaving it untouched`);
        } else {
          await setDoc(paymentRef, {
            orderId: orderNumber,
            amountCents: Math.round(((payload.total as number) || 0) * 100),
            method: (payload.paymentMethod as string) || 'Cash',
            status: 'paid',
            processedBy: (payload.createdBy as string) || currentUser.uid,
            tipCents: 0,
            reference: orderNumber,
            notes: `${(payload.orderType as string) || 'Order'} — ${(payload.customer as string) || 'Walk-in Guest'}`,
            workspaceId,
            createdBy: currentUser.uid,
            ownerId: workspaceId,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // ── 5. Increment coupon usage if applicable ──
      const couponId = payload.couponId as string | undefined;
      if (couponId) {
        try {
          const couponRef = doc(db, 'workspaces', workspaceId, 'loyaltyCoupons', couponId);
          await updateDoc(couponRef, { usedCount: increment(1), updatedAt: now });
        } catch { /* non-critical — coupon tracking is best-effort */ }
      }
    }

    return { ok: true };
  } catch (err) {
    const described = describeError(err);
    // Carry the identity context: a permission-denied that survives both
    // ownership gates is almost always an auth/workspace mismatch, and the
    // stored error must be enough to diagnose it without re-running anything.
    const context =
      `signedInUid=${session.uid} signedInWorkspaceId=${session.workspaceId ?? 'unknown'} ` +
      `payload.createdBy=${payloadCreatedBy || '(none)'} payload.workspaceId=${(payload.workspaceId as string) || '(none)'}`;
    const error = `${described.error} [${context}]`.slice(0, MAX_ERROR_LEN);
    console.warn(`[SyncDrain] Order replay failed for ${orderNumber}: ${error}`);
    return { ok: false, error, retryable: described.retryable };
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

/**
 * Arms the drain engine. Nothing drains until Firebase reports a signed-in
 * user; sign-out stops the loop again.
 */
export function startSyncDrain(): void {
  console.log('[SyncDrain] Arming sync drain engine (waits for a Firebase session)');

  // Recover rows left in 'processing' by a crash mid-drain before the first cycle.
  import('../database/connection')
    .then(({ getDatabase }) => {
      const info = getDatabase()
        .prepare("UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'")
        .run();
      if (info.changes > 0) {
        console.log(`[SyncDrain] Recovered ${info.changes} row(s) left in 'processing' by a previous run`);
      }
    })
    .catch((err) => console.error('[SyncDrain] Failed to reset processing rows:', err));

  // Drive the loop from auth state instead of a fixed startup timer.
  import('../firebase/auth')
    .then(({ onAuthChange }) => {
      authUnsub = onAuthChange((user) => {
        if (user) handleSignedIn(user.uid);
        else handleSignedOut();
      });
    })
    .catch((err) => console.error('[SyncDrain] Failed to attach auth listener:', err));
}

export function stopSyncDrain(): void {
  stopLoops();
  if (authUnsub) {
    try { authUnsub(); } catch { /* noop */ }
    authUnsub = null;
  }
  signedIn = false;
}

export function getSyncState() {
  return { signedIn, online, lastSyncResult, draining };
}

export function triggerDrain(): void {
  void drainQueue('manual');
}
