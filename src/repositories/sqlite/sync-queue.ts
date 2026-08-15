/**
 * sync-queue.ts — sync queue insertion helpers for SQLite repositories.
 *
 * Every write operation (INSERT / UPDATE / DELETE / UPSERT) automatically
 * enqueues a record into sync_queue so it can be pushed to the cloud later.
 *
 * Does NOT perform cloud sync — only inserts into sync_queue.
 */

import type Database from 'better-sqlite3';
import type { EntityType, SyncOperation } from '../../sync/SyncTypes';

// ── Prepared Statement Cache ──

let _insertStmt: Database.Statement | null = null;

function getInsertStmt(db: Database.Database): Database.Statement {
  if (!_insertStmt) {
    _insertStmt = db.prepare(`
      INSERT INTO sync_queue
        (workspace_id, branch_id, entity_type, entity_id, operation, payload, status, retry_count, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, 'pending', 0, datetime('now'), datetime('now'))
    `);
  }
  return _insertStmt;
}

// ── Public API ──

/**
 * Enqueue a single sync record.
 *
 * @param db          The better-sqlite3 Database instance.
 * @param entityType  The type of entity (order, customer, product, etc.).
 * @param entityId    The primary key of the entity record.
 * @param operation   'create', 'update', or 'delete'.
 * @param payload     The full entity data to sync (serialised as JSON).
 * @param workspaceId The workspace scope (defaults to 'default').
 * @param branchId    The branch scope (defaults to 'main').
 */
export function enqueueSyncEntry(
  db: Database.Database,
  entityType: EntityType,
  entityId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
  workspaceId = 'default',
  branchId = 'main',
): void {
  const stmt = getInsertStmt(db);
  stmt.run(workspaceId, branchId, entityType, entityId, operation, JSON.stringify(payload));
}

/**
 * Enqueue multiple sync records in a single transaction.
 *
 * @param db     The better-sqlite3 Database instance.
 * @param entries Array of sync entry descriptors.
 */
export function enqueueSyncBatch(
  db: Database.Database,
  entries: {
    entityType: EntityType;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
    workspaceId?: string;
    branchId?: string;
  }[],
): void {
  const insert = db.transaction(() => {
    for (const entry of entries) {
      enqueueSyncEntry(
        db,
        entry.entityType,
        entry.entityId,
        entry.operation,
        entry.payload,
        entry.workspaceId ?? 'default',
        entry.branchId ?? 'main',
      );
    }
  });
  insert();
}

/**
 * Clear the prepared statement cache (useful when the DB connection is reset).
 */
export function clearSyncQueueCache(): void {
  _insertStmt = null;
}
