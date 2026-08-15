/**
 * SyncManager — top-level orchestrator for the sync architecture.
 * Coordinates queue, processor, conflict resolver, network monitor, and logger.
 * Interface only. No implementation.
 */

import type { SyncResult, SyncEvent, SyncConfig, EntityType, ConflictRecord, ConflictStrategy } from './SyncTypes';
import type { NetworkStatus } from './SyncTypes';
import type { ISyncQueue } from './SyncQueue';
import type { IQueueProcessor } from './QueueProcessor';
import type { IConflictResolver } from './ConflictResolver';
import type { INetworkMonitor } from './NetworkMonitor';
import type { ISyncLogger } from './SyncLogger';
import type { IRetryPolicy } from './RetryPolicy';

// ── Sync Manager Interface ──

export interface ISyncManager {
  // ── Lifecycle ──

  /** Initialize the sync manager and all sub-components */
  initialize(config?: Partial<SyncConfig>): Promise<void>;

  /** Start synchronization (begins periodic sync) */
  start(): Promise<void>;

  /** Stop synchronization */
  stop(): Promise<void>;

  /** Destroy the sync manager and clean up resources */
  destroy(): Promise<void>;

  // ── Sync Operations ──

  /** Trigger a full sync cycle (push + pull) */
  syncAll(): Promise<SyncResult>;

  /** Push local changes to the remote server */
  pushChanges(entityTypes?: EntityType[]): Promise<number>;

  /** Pull remote changes to the local database */
  pullChanges(entityTypes?: EntityType[]): Promise<number>;

  /** Resolve all pending conflicts */
  resolveConflicts(strategy?: ConflictStrategy): Promise<number>;

  /** Cancel an in-progress sync operation */
  cancelSync(): Promise<void>;

  // ── Status ──

  /** Check if a sync operation is currently in progress */
  isSyncing(): boolean;

  /** Get the current sync configuration */
  getConfig(): SyncConfig;

  /** Update the sync configuration */
  updateConfig(config: Partial<SyncConfig>): Promise<void>;

  /** Get the current network status */
  getNetworkStatus(): NetworkStatus;

  /** Get the number of pending items in the queue */
  getPendingCount(): Promise<number>;

  // ── Events ──

  /** Register a callback for sync events */
  onSyncEvent(callback: (event: SyncEvent) => void): () => void;

  /** Register a callback for network status changes */
  onNetworkChange(callback: (status: NetworkStatus) => void): () => void;

  /** Register a callback for conflicts that need manual resolution */
  onConflict(callback: (conflict: ConflictRecord) => void): () => void;

  // ── Sub-components ──

  /** Get the sync queue */
  getQueue(): ISyncQueue;

  /** Get the queue processor */
  getProcessor(): IQueueProcessor;

  /** Get the conflict resolver */
  getConflictResolver(): IConflictResolver;

  /** Get the network monitor */
  getNetworkMonitor(): INetworkMonitor;

  /** Get the sync logger */
  getLogger(): ISyncLogger;

  /** Get the retry policy */
  getRetryPolicy(): IRetryPolicy;
}

// ── Sync Manager Dependencies ──

export interface SyncManagerDependencies {
  queue: ISyncQueue;
  processor: IQueueProcessor;
  conflictResolver: IConflictResolver;
  networkMonitor: INetworkMonitor;
  logger: ISyncLogger;
  retryPolicy: IRetryPolicy;
}

// ── Sync Manager State ──

export interface SyncManagerState {
  initialized: boolean;
  running: boolean;
  syncing: boolean;
  config: SyncConfig;
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
}
