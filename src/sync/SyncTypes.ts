/**
 * SyncTypes — core type definitions for the sync architecture.
 * Interfaces only. No implementation.
 */

// ── Entity Types ──

export type EntityType =
  | 'order'
  | 'customer'
  | 'product'
  | 'inventory'
  | 'payment'
  | 'table'
  | 'kitchen'
  | 'staff'
  | 'settings';

// ── Operations ──

export type SyncOperation = 'create' | 'update' | 'delete';

// ── Sync Status ──

export type SyncItemStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';

// ── Conflict Strategy ──

export type ConflictStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'merge';

// ── Network Status ──

export type NetworkStatus = 'online' | 'offline' | 'degraded';

// ── Sync Queue Item ──

export interface SyncQueueItem {
  id: number;
  workspaceId: string;
  branchId: string;
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  payload: string;
  status: SyncItemStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
}

// ── Sync Result ──

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

// ── Sync Event ──

export interface SyncEvent {
  type: 'sync-start' | 'sync-complete' | 'sync-error' | 'push-start' | 'push-complete' | 'pull-start' | 'pull-complete' | 'conflict-detected' | 'conflict-resolved' | 'network-change';
  timestamp: string;
  payload?: Record<string, unknown>;
}

// ── Sync Config ──

export interface SyncConfig {
  enabled: boolean;
  syncIntervalMs: number;
  batchSize: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  conflictStrategy: ConflictStrategy;
  entities: EntityType[];
}

// ── Conflict Record ──

export interface ConflictRecord {
  id: string;
  entityType: EntityType;
  entityId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  strategy: ConflictStrategy;
  resolvedAt: string | null;
  resolvedData: Record<string, unknown> | null;
}

// ── Network State ──

export interface NetworkState {
  status: NetworkStatus;
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
  latencyMs: number | null;
}

// ── Retry Config ──

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
}

// ── Log Entry ──

export interface SyncLogEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  entityType: EntityType | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}

// ── Queue Stats ──

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  conflict: number;
}

// ── Process Result ──

export interface ProcessResult {
  itemId: number;
  success: boolean;
  error: string | null;
  conflict: ConflictRecord | null;
}
