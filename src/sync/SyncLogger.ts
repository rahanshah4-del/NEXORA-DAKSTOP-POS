/**
 * SyncLogger — structured logging for sync operations.
 * Interface only. No implementation.
 */

import type { SyncLogEntry, EntityType } from './SyncTypes';

// ── Log Level ──

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ── Sync Logger Interface ──

export interface ISyncLogger {
  /** Log a debug message */
  debug(message: string, meta?: Record<string, unknown>): void;

  /** Log an info message */
  info(message: string, meta?: Record<string, unknown>): void;

  /** Log a warning message */
  warn(message: string, meta?: Record<string, unknown>): void;

  /** Log an error message */
  error(message: string, meta?: Record<string, unknown>): void;

  /** Log a sync-specific event with entity context */
  logSyncEvent(
    level: LogLevel,
    message: string,
    entityType: EntityType | null,
    entityId: string | null,
    metadata?: Record<string, unknown>,
  ): void;

  /** Retrieve recent log entries */
  getRecentEntries(limit?: number): SyncLogEntry[];

  /** Retrieve log entries for a specific entity */
  getEntriesForEntity(entityType: EntityType, entityId: string): SyncLogEntry[];

  /** Clear old log entries */
  pruneLogs(olderThanDays: number): void;

  /** Set minimum log level */
  setLevel(level: LogLevel): void;

  /** Get current log level */
  getLevel(): LogLevel;
}

// ── Log Writer Interface ──

export interface ILogWriter {
  write(entry: SyncLogEntry): void;
  read(filter?: Partial<SyncLogEntry>, limit?: number): SyncLogEntry[];
  delete(olderThanDays: number): number;
}
