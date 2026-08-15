/**
 * IApplicationService.ts — Marker interface for application services.
 *
 * Application services sit between the dispatcher and domain services.
 * They encapsulate cross-cutting orchestration that doesn't belong
 * in a single command/query handler.
 */

import type { IApplicationContext } from './ApplicationContext';

/**
 * Marker interface for all application-layer services.
 *
 * Application services are NOT command handlers — they are injected
 * into handlers to provide shared behaviour (e.g., ID generation,
 * timestamp creation, event publishing, notification dispatch).
 */
export interface IApplicationService {
  /** Human-readable service name for diagnostics. */
  readonly serviceName: string;
}

// ── Built-in Application Services ──

export interface IClock extends IApplicationService {
  /** Current UTC timestamp in ISO format. */
  utcNow(): string;

  /** Current timestamp in the context's timezone. */
  nowInContext(context: IApplicationContext): string;
}

export interface ILogger extends IApplicationService {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

export interface IMetrics extends IApplicationService {
  /** Record the duration of a command/query execution. */
  recordExecution(operationType: string, operationName: string, durationMs: number, success: boolean): void;

  /** Increment a named counter. */
  incrementCounter(name: string, tags?: Record<string, string>): void;

  /** Get current metrics snapshot. */
  getSnapshot(): ApplicationMetricsSnapshot;
}

export interface ApplicationMetricsSnapshot {
  totalCommands: number;
  totalQueries: number;
  failedCommands: number;
  failedQueries: number;
  averageCommandDurationMs: number;
  averageQueryDurationMs: number;
  counters: Record<string, number>;
}
