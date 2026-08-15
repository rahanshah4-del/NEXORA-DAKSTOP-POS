/**
 * IRepository — generic repository interface.
 * Base interface that all entity repositories extend.
 * Interface only. No implementation.
 */

import type { QueryOptions } from '../services/db-service';

// ── Generic Repository Interface ──

export interface IRepository<T> {
  /** Find all records with optional filtering and pagination */
  findAll(opts?: QueryOptions): Promise<T[]>;

  /** Find a single record by ID */
  findById(id: string): Promise<T | null>;

  /** Create a new record */
  create(data: Partial<T>): Promise<T>;

  /** Update an existing record by ID */
  update(id: string, data: Partial<T>): Promise<T>;

  /** Delete a record by ID */
  delete(id: string): Promise<void>;

  /** Count records matching optional filter */
  count(where?: string, params?: unknown[]): Promise<number>;

  /** Check if a record exists by ID */
  exists(id: string): Promise<boolean>;
}

// ── Sync-aware Repository Interface ──

export interface ISyncRepository<T> extends IRepository<T> {
  /** Find records modified after a given timestamp (for sync) */
  findModifiedSince(since: string): Promise<T[]>;

  /** Find records by a list of IDs */
  findByIds(ids: string[]): Promise<T[]>;

  /** Create or update a record (upsert) — used during sync pulls */
  upsert(id: string, data: Partial<T>): Promise<T>;

  /** Soft-delete a record (mark as deleted instead of removing) */
  softDelete(id: string): Promise<void>;

  /** Get the last modification timestamp for this entity type */
  getLastModifiedAt(): Promise<string | null>;
}
