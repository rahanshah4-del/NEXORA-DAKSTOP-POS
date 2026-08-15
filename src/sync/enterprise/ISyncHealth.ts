/**
 * ISyncHealth — sync health monitoring interfaces.
 *
 * Provides observability into the sync system's operational
 * state for diagnostics, alerting, and dashboards.
 *
 * Interface only. No implementation.
 */

import type { EntityType, NetworkStatus, QueueStats } from '../SyncTypes';

// ── Sync Health Snapshot ──

export interface ISyncHealthSnapshot {
  /** ISO-8601 timestamp when this snapshot was taken */
  timestamp: string;

  /** Overall health status */
  overall: HealthStatus;

  /** Queue health metrics */
  queue: IQueueHealth;

  /** Network health metrics */
  network: INetworkHealth;

  /** Database health metrics */
  database: IDatabaseHealth;

  /** Sync engine health metrics */
  sync: ISyncEngineHealth;

  /** Device health metrics */
  device: IDeviceHealth;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ── Queue Health ──

export interface IQueueHealth {
  /** Current queue statistics */
  stats: QueueStats;

  /** Total queue size (all statuses) */
  totalSize: number;

  /** Number of items pending */
  pending: number;

  /** Number of items currently processing */
  processing: number;

  /** Number of permanently failed items */
  failed: number;

  /** Number of items in conflict */
  conflictCount: number;

  /** Oldest pending item age in seconds */
  oldestPendingAgeSeconds: number | null;

  /** Average processing time per item in milliseconds */
  averageProcessingTimeMs: number | null;

  /** Queue health status */
  status: HealthStatus;

  /** Warning threshold: queue size at which status becomes degraded */
  warningThreshold: number;

  /** Critical threshold: queue size at which status becomes unhealthy */
  criticalThreshold: number;
}

// ── Network Health ──

export interface INetworkHealth {
  /** Current network status */
  status: NetworkStatus;

  /** Whether connected to the sync server */
  connectedToServer: boolean;

  /** Average round-trip latency in milliseconds */
  averageLatencyMs: number | null;

  /** Packet loss percentage (0–100) */
  packetLossPercent: number | null;

  /** ISO-8601 when the device was last online */
  lastOnlineAt: string | null;

  /** ISO-8601 when the device was last offline */
  lastOfflineAt: string | null;

  /** Total time spent offline today in seconds */
  offlineDurationTodaySeconds: number;

  /** Number of disconnection events today */
  disconnectionCountToday: number;

  /** Network health status */
  healthStatus: HealthStatus;
}

// ── Database Health ──

export interface IDatabaseHealth {
  /** Total database size in bytes */
  sizeBytes: number;

  /** Number of tables */
  tableCount: number;

  /** Database integrity check result */
  integrityCheckPassed: boolean;

  /** WAL file size in bytes */
  walSizeBytes: number | null;

  /** Number of rows per syncable entity type */
  entityRowCounts: Partial<Record<EntityType, number>>;

  /** Whether the database connection is alive */
  connectionAlive: boolean;

  /** ISO-8601 of the last vacuum operation */
  lastVacuumAt: string | null;

  /** ISO-8601 of the last integrity check */
  lastIntegrityCheckAt: string | null;

  /** Database health status */
  healthStatus: HealthStatus;
}

// ── Sync Engine Health ──

export interface ISyncEngineHealth {
  /** Whether the sync engine is currently running */
  isRunning: boolean;

  /** Whether a sync cycle is in progress */
  isSyncing: boolean;

  /** Current sync session ID, null if idle */
  currentSessionId: string | null;

  /** ISO-8601 of the last successful sync */
  lastSuccessfulSyncAt: string | null;

  /** ISO-8601 of the last failed sync */
  lastFailedSyncAt: string | null;

  /** Total successful syncs since engine start */
  successfulSyncsSinceStart: number;

  /** Total failed syncs since engine start */
  failedSyncsSinceStart: number;

  /** Sync success rate (0–100) */
  successRatePercent: number;

  /** Average sync cycle duration in milliseconds */
  averageSyncDurationMs: number | null;

  /** Sync engine health status */
  healthStatus: HealthStatus;
}

// ── Device Health ──

export interface IDeviceHealth {
  /** Device ID */
  deviceId: string;

  /** Application uptime in seconds */
  appUptimeSeconds: number;

  /** System uptime in seconds */
  systemUptimeSeconds: number | null;

  /** Free memory in bytes */
  freeMemoryBytes: number | null;

  /** Total memory in bytes */
  totalMemoryBytes: number | null;

  /** Free disk space in bytes */
  freeDiskBytes: number | null;

  /** CPU usage percentage (0–100) */
  cpuUsagePercent: number | null;

  /** Whether the device has sufficient resources */
  resourcesAdequate: boolean;

  /** Device health status */
  healthStatus: HealthStatus;
}

// ── Sync Health Provider Interface ──

export interface ISyncHealthProvider {
  /** Take a full health snapshot */
  takeSnapshot(): Promise<ISyncHealthSnapshot>;

  /** Get only queue health */
  getQueueHealth(): Promise<IQueueHealth>;

  /** Get only network health */
  getNetworkHealth(): Promise<INetworkHealth>;

  /** Get only database health */
  getDatabaseHealth(): Promise<IDatabaseHealth>;

  /** Get only sync engine health */
  getSyncEngineHealth(): Promise<ISyncEngineHealth>;

  /** Get only device health */
  getDeviceHealth(): Promise<IDeviceHealth>;

  /** Get the overall health status */
  getOverallStatus(): HealthStatus;

  /** Register a health alert callback (fires when status changes) */
  onHealthAlert(callback: (snapshot: ISyncHealthSnapshot) => void): () => void;

  /** Get historical health snapshots */
  getHistory(limit?: number): Promise<ISyncHealthSnapshot[]>;

  /** Get the most recent health snapshot */
  getLatestSnapshot(): Promise<ISyncHealthSnapshot | null>;
}

// ── Health Alert ──

export interface IHealthAlert {
  id: string;
  timestamp: string;
  component: 'queue' | 'network' | 'database' | 'sync' | 'device';
  previousStatus: HealthStatus;
  currentStatus: HealthStatus;
  message: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}
