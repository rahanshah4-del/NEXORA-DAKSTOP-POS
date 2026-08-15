/**
 * SQLite Repository Implementations — barrel export.
 *
 * Concrete repository implementations using better-sqlite3.
 * Each repository:
 *   ✔ Implements its existing interface
 *   ✔ Uses the existing SQLite connection
 *   ✔ Uses transactions where required
 *   ✔ Supports CRUD, bulk operations, pagination, filtering, sorting, search
 *   ✔ Supports soft delete and optimistic versioning
 *   ✔ Automatically updates updated_at
 *   ✔ Automatically creates sync queue entries on every write
 */

// ── Shared Helpers ──
export { BaseSqliteRepository } from './base-repository';
export { enqueueSyncEntry, enqueueSyncBatch, clearSyncQueueCache } from './sync-queue';
export {
  snakeToCamel,
  camelToSnake,
  mapRowToCamel,
  mapToSnake,
  intToBool,
  boolToInt,
  parseJson,
  buildWhereClause,
  buildQueryOptions,
  buildSearchClause,
  buildInClause,
  combineWhereClauses,
  notDeletedClause,
  generateId,
  now,
  DELETED_AT_COLUMN,
  VERSION_COLUMN,
} from './utils';

// ── Concrete Repositories ──
export { SQLiteOrderRepository } from './order-repository';
export { SQLiteCustomerRepository } from './customer-repository';
export { SQLiteProductRepository } from './product-repository';
export { SQLiteInventoryRepository } from './inventory-repository';
export { SQLitePaymentRepository } from './payment-repository';
export { SQLiteTableRepository } from './table-repository';
export { SQLiteKitchenRepository } from './kitchen-repository';
export { SQLiteStaffRepository } from './staff-repository';
export { SQLiteSettingsRepository } from './settings-repository';
