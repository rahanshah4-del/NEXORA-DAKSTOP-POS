/**
 * SyncQueue — manages the queue of pending sync operations.
 * Interface only. No implementation.
 */

import type {
  SyncQueueItem,
  SyncOperation,
  EntityType,
  SyncItemStatus,
  QueueStats,
} from './SyncTypes';

// ── Sync Queue Interface ──

export interface ISyncQueue {
  /** Enqueue a new sync operation */
  enqueue(
    workspaceId: string,
    branchId: string,
    entityType: EntityType,
    entityId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>,
  ): Promise<SyncQueueItem>;

  /** Enqueue multiple operations in a batch */
  enqueueBatch(
    items: Array<{
      workspaceId: string;
      branchId: string;
      entityType: EntityType;
      entityId: string;
      operation: SyncOperation;
      payload: Record<string, unknown>;
    }>,
  ): Promise<SyncQueueItem[]>;

  /** Dequeue the next batch of pending items for processing */
  dequeueBatch(limit: number): Promise<SyncQueueItem[]>;

  /** Get all items with a specific status */
  getByStatus(status: SyncItemStatus): Promise<SyncQueueItem[]>;

  /** Get items for a specific entity */
  getByEntity(entityType: EntityType, entityId: string): Promise<SyncQueueItem[]>;

  /** Get items for a workspace and branch */
  getByWorkspace(workspaceId: string, branchId: string): Promise<SyncQueueItem[]>;

  /** Mark an item as completed */
  markCompleted(id: number): Promise<void>;

  /** Mark an item as failed with an error message */
  markFailed(id: number, error: string): Promise<void>;

  /** Mark an item as in conflict */
  markConflict(id: number): Promise<void>;

  /** Mark an item as processing */
  markProcessing(id: number): Promise<void>;

  /** Increment the retry count for an item */
  incrementRetry(id: number): Promise<void>;

  /** Remove a completed item from the queue */
  remove(id: number): Promise<void>;

  /** Remove all completed items older than the retention period */
  pruneCompleted(retentionDays: number): Promise<number>;

  /** Get current queue statistics */
  getStats(): Promise<QueueStats>;

  /** Get the total count of pending items */
  getPendingCount(): Promise<number>;

  /** Clear all items from the queue */
  clear(): Promise<void>;

  /** Check if there are any pending items */
  hasPending(): Promise<boolean>;
}

// ── Queue Item Filter ──

export interface QueueItemFilter {
  workspaceId?: string;
  branchId?: string;
  entityType?: EntityType;
  entityId?: string;
  operation?: SyncOperation;
  status?: SyncItemStatus;
  since?: string;
  before?: string;
}
