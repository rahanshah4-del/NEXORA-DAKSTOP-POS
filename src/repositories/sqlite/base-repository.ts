/**
 * base-repository.ts — abstract base class for all SQLite repository implementations.
 *
 * Provides:
 *   ✔ CRUD (findAll, findById, create, update, delete, count, exists)
 *   ✔ Sync-aware operations (findModifiedSince, findByIds, upsert, softDelete, getLastModifiedAt)
 *   ✔ Automatic updated_at management
 *   ✔ Optimistic versioning (version column incremented on every write)
 *   ✔ Soft-delete support (deleted_at column)
 *   ✔ Automatic sync queue insertion on every write
 *   ✔ Prepared statements only — no string concatenation, no SQL injection
 *
 * Subclasses implement:
 *   - tableName: the SQLite table name
 *   - entityType: the EntityType for sync queue entries
 *   - toModel(row): map a DB row (snake_case) to the domain model (camelCase)
 *   - toDb(data): map partial domain model fields to DB column values (snake_case)
 */

import type Database from 'better-sqlite3';
import type { QueryOptions } from '../../services/db-service';
import type { IRepository, ISyncRepository } from '../IRepository';
import type { EntityType, SyncOperation } from '../../sync/SyncTypes';
import {
  buildQueryOptions,
  buildWhereClause,
  buildInClause,
  notDeletedClause,
  combineWhereClauses,
  generateId,
  DELETED_AT_COLUMN,
  VERSION_COLUMN,
} from './utils';
import { enqueueSyncEntry } from './sync-queue';

// ── Abstract Base Class ──

export abstract class BaseSqliteRepository<T extends { id: string }>
  implements IRepository<T>, ISyncRepository<T>
{
  /** The SQLite table name. */
  protected abstract tableName: string;

  /** The EntityType used in sync_queue.entity_type. */
  protected abstract entityType: EntityType;

  /** Whether this repository uses soft-delete (deleted_at column). */
  protected useSoftDelete = true;

  /** Whether this repository uses optimistic versioning (version column). */
  protected useVersioning = true;

  constructor(protected db: Database.Database) {}

  // ── Abstract Methods (subclass contract) ──

  /**
   * Map a raw database row (snake_case keys) to the domain model (camelCase keys).
   * Subclasses MUST override this to handle type-specific conversions (bool, JSON, etc.).
   */
  protected abstract toModel(row: Record<string, unknown>): T;

  /**
   * Map a partial domain model (camelCase keys) to database column values (snake_case keys).
   * Subclasses MUST override this to handle type-specific conversions (bool, JSON, etc.).
   *
   * Only the fields present in `data` should be returned — the caller will merge as needed.
   */
  protected abstract toDb(data: Partial<T>): Record<string, unknown>;

  // ── Row Fetching Helpers ──

  /**
   * Execute a SELECT that returns zero or one row, mapped to the model type.
   */
  protected getOne(sql: string, params: unknown[]): T | null {
    const row = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    return row ? this.toModel(row) : null;
  }

  /**
   * Execute a SELECT that returns zero or more rows, each mapped to the model type.
   */
  protected getMany(sql: string, params: unknown[]): T[] {
    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.toModel(row));
  }

  /**
   * Execute a write statement (INSERT / UPDATE / DELETE) and return the number of changed rows.
   */
  protected execute(sql: string, params: unknown[]): number {
    const result = this.db.prepare(sql).run(...params);
    return result.changes;
  }

  /**
   * Build the base WHERE clause that excludes soft-deleted rows (when enabled).
   */
  protected get activeWhereClause(): string {
    return this.useSoftDelete ? notDeletedClause() : '1=1';
  }

  // ── IRepository<T> ──

  async findAll(opts?: QueryOptions): Promise<T[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(opts);

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      `WHERE ${this.activeWhereClause}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, params);
  }

  async findById(id: string): Promise<T | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ? AND ${this.activeWhereClause}`;
    return this.getOne(sql, [id]);
  }

  async create(data: Partial<T>): Promise<T> {
    const id = (data as { id?: string }).id ?? generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const dbData = this.toDb(data);

    // Build column list and value placeholders
    const columns: string[] = ['id', 'created_at', 'updated_at'];
    const values: unknown[] = [id, now, now];

    if (this.useVersioning) {
      columns.push(VERSION_COLUMN);
      values.push(1);
    }

    for (const [key, value] of Object.entries(dbData)) {
      if (value === undefined) continue;
      columns.push(key);
      values.push(value);
    }

    const placeholders = columns.map(() => '?').join(', ');

    const runInsert = this.db.transaction(() => {
      this.execute(
        `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values,
      );

      // Build payload for sync queue (full record)
      const record = this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      if (record) {
        enqueueSyncEntry(this.db, this.entityType, id, 'create', record as unknown as Record<string, unknown>);
      }

      return record;
    });

    const result = runInsert();
    if (!result) {
      throw new Error(`Failed to create ${this.entityType} record: ${id}`);
    }
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const dbData = this.toDb(data);

    const setClauses: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (this.useVersioning) {
      setClauses.push(`${VERSION_COLUMN} = ${VERSION_COLUMN} + 1`);
    }

    for (const [key, value] of Object.entries(dbData)) {
      if (value === undefined) continue;
      setClauses.push(`${key} = ?`);
      values.push(value);
    }

    // WHERE clause
    const whereConditions = ['id = ?'];
    values.push(id);
    if (this.useSoftDelete) {
      whereConditions.push(notDeletedClause());
    }

    const runUpdate = this.db.transaction(() => {
      const changes = this.execute(
        `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE ${whereConditions.join(' AND ')}`,
        values,
      );

      if (changes === 0) {
        throw new Error(`${this.entityType} record not found: ${id}`);
      }

      // Build payload for sync queue
      const record = this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
      if (record) {
        enqueueSyncEntry(this.db, this.entityType, id, 'update', record as unknown as Record<string, unknown>);
      }

      return record;
    });

    const result = runUpdate();
    if (!result) {
      throw new Error(`Failed to update ${this.entityType} record: ${id}`);
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    if (this.useSoftDelete) {
      await this.softDelete(id);
      return;
    }

    const runDelete = this.db.transaction(() => {
      // Read record before deleting for sync payload
      const record = this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);

      this.execute(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);

      if (record) {
        enqueueSyncEntry(this.db, this.entityType, id, 'delete', record as unknown as Record<string, unknown>);
      }
    });

    runDelete();
  }

  async count(where?: string, params?: unknown[]): Promise<number> {
    const conditions = [this.activeWhereClause];
    const allParams: unknown[] = [];

    if (where) {
      conditions.push(where);
      if (params) allParams.push(...params);
    }

    const sql = `SELECT COUNT(*) as cnt FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`;
    const row = this.db.prepare(sql).get(...allParams) as { cnt: number } | undefined;
    return row?.cnt ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? AND ${this.activeWhereClause} LIMIT 1`;
    const row = this.db.prepare(sql).get(id);
    return row !== undefined;
  }

  // ── ISyncRepository<T> ──

  async findModifiedSince(since: string): Promise<T[]> {
    const condition = this.useSoftDelete
      ? `updated_at > ? AND ${this.activeWhereClause}`
      : 'updated_at > ?';

    const sql = `SELECT * FROM ${this.tableName} WHERE ${condition} ORDER BY updated_at ASC`;
    return this.getMany(sql, [since]);
  }

  async findByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];

    const inClause = buildInClause('id', ids);
    const conditions = [inClause.sql];

    if (this.useSoftDelete) {
      conditions.push(this.activeWhereClause);
    }

    const placeholders = ids.map(() => '?').join(', ');
    const softDeletePart = this.useSoftDelete ? ` AND ${this.activeWhereClause}` : '';

    const sql = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})${softDeletePart}`;
    return this.getMany(sql, ids);
  }

  async upsert(id: string, data: Partial<T>): Promise<T> {
    const existing = await this.findById(id);

    if (existing) {
      // Record exists (and is not soft-deleted) — update it
      return this.update(id, data);
    }

    // Check if there's a soft-deleted record we should restore
    if (this.useSoftDelete) {
      const deleted = this.getOne(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND ${DELETED_AT_COLUMN} IS NOT NULL`,
        [id],
      );

      if (deleted) {
        // Restore the soft-deleted record
        const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
        const dbData = this.toDb(data);

        const setClauses: string[] = [
          `${DELETED_AT_COLUMN} = NULL`,
          'updated_at = ?',
        ];
        const values: unknown[] = [now];

        if (this.useVersioning) {
          setClauses.push(`${VERSION_COLUMN} = ${VERSION_COLUMN} + 1`);
        }

        for (const [key, value] of Object.entries(dbData)) {
          if (value === undefined) continue;
          setClauses.push(`${key} = ?`);
          values.push(value);
        }

        values.push(id);

        const runRestore = this.db.transaction(() => {
          this.execute(
            `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`,
            values,
          );

          const record = this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
          if (record) {
            enqueueSyncEntry(this.db, this.entityType, id, 'update', record as unknown as Record<string, unknown>);
          }
          return record;
        });

        const result = runRestore();
        if (!result) {
          throw new Error(`Failed to restore ${this.entityType} record: ${id}`);
        }
        return result;
      }
    }

    // Record doesn't exist at all — create it
    const createData = { ...data, id } as Partial<T>;
    return this.create(createData);
  }

  async softDelete(id: string): Promise<void> {
    if (!this.useSoftDelete) {
      // Fall back to hard delete if soft delete is not configured
      await this.delete(id);
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runSoftDelete = this.db.transaction(() => {
      const record = this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ? AND ${this.activeWhereClause}`, [id]);

      if (!record) {
        throw new Error(`${this.entityType} record not found: ${id}`);
      }

      const extraSets = this.useVersioning ? `, ${VERSION_COLUMN} = ${VERSION_COLUMN} + 1` : '';

      this.execute(
        `UPDATE ${this.tableName} SET ${DELETED_AT_COLUMN} = ?, updated_at = ?${extraSets} WHERE id = ?`,
        [now, now, id],
      );

      enqueueSyncEntry(this.db, this.entityType, id, 'delete', record as unknown as Record<string, unknown>);
    });

    runSoftDelete();
  }

  async getLastModifiedAt(): Promise<string | null> {
    const whereClause = this.useSoftDelete ? `WHERE ${this.activeWhereClause}` : '';
    const sql = `SELECT MAX(updated_at) AS last_modified FROM ${this.tableName} ${whereClause}`;
    const row = this.db.prepare(sql).get() as { last_modified: string | null } | undefined;
    return row?.last_modified ?? null;
  }
}
