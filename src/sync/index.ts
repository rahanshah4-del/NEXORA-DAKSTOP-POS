/**
 * Sync Module — barrel export.
 * All sync architecture interfaces and types.
 */

// ── Types ──
export type {
  EntityType,
  SyncOperation,
  SyncItemStatus,
  ConflictStrategy,
  NetworkStatus,
  SyncQueueItem,
  SyncResult,
  SyncEvent,
  SyncConfig,
  ConflictRecord,
  NetworkState,
  RetryConfig,
  SyncLogEntry,
  QueueStats,
  ProcessResult,
} from './SyncTypes';

// ── Constants ──
export {
  SYNC_TABLE_NAMES,
  DEFAULT_SYNC_CONFIG,
  DEFAULT_RETRY_CONFIG,
  QUEUE_MAX_BATCH_SIZE,
  QUEUE_MAX_RETENTION_DAYS,
  NETWORK_PING_INTERVAL_MS,
  NETWORK_PING_TIMEOUT_MS,
  NETWORK_DEGRADED_LATENCY_MS,
  SYNC_INTERVAL_MS,
  SYNC_FAST_INTERVAL_MS,
  SYNC_SLOW_INTERVAL_MS,
  SYNC_LOCK_KEY,
  SYNC_LOCK_TTL_MS,
} from './SyncConstants';

// ── Sync Manager ──
export type { ISyncManager, SyncManagerDependencies, SyncManagerState } from './SyncManager';

// ── Sync Queue ──
export type { ISyncQueue, QueueItemFilter } from './SyncQueue';

// ── Queue Processor ──
export type {
  IQueueProcessor,
  ProcessorConfig,
  ProcessorEvent,
} from './QueueProcessor';
export { DEFAULT_PROCESSOR_CONFIG } from './QueueProcessor';

// ── Conflict Resolver ──
export type {
  IConflictResolver,
  ConflictDetectionResult,
  ResolutionOutcome,
} from './ConflictResolver';

// ── Network Monitor ──
export type { INetworkMonitor, NetworkEvent } from './NetworkMonitor';

// ── Sync Logger ──
export type { ISyncLogger, ILogWriter, LogLevel } from './SyncLogger';

// ── Retry Policy ──
export type { IRetryPolicy, IRetryPolicyConfig } from './RetryPolicy';
export { DEFAULT_RETRY_CONFIG as RETRY_DEFAULTS } from './RetryPolicy';
