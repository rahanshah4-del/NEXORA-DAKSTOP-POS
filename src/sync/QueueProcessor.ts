/**
 * QueueProcessor — processes items in the sync queue.
 * Interface only. No implementation.
 */

import type { SyncQueueItem, ProcessResult } from './SyncTypes';
import type { IRetryPolicy } from './RetryPolicy';
import type { IConflictResolver } from './ConflictResolver';

// ── Queue Processor Interface ──

export interface IQueueProcessor {
  /** Process a single queue item */
  processItem(item: SyncQueueItem): Promise<ProcessResult>;

  /** Process a batch of queue items */
  processBatch(items: SyncQueueItem[]): Promise<ProcessResult[]>;

  /** Start the processor (begins polling the queue) */
  start(): Promise<void>;

  /** Stop the processor */
  stop(): Promise<void>;

  /** Check if the processor is currently running */
  isRunning(): boolean;

  /** Set the retry policy to use */
  setRetryPolicy(policy: IRetryPolicy): void;

  /** Set the conflict resolver to use */
  setConflictResolver(resolver: IConflictResolver): void;
}

// ── Processor Config ──

export interface ProcessorConfig {
  batchSize: number;
  pollIntervalMs: number;
  maxConcurrent: number;
  processTimeoutMs: number;
}

// ── Default Processor Config ──

export const DEFAULT_PROCESSOR_CONFIG: ProcessorConfig = {
  batchSize: 50,
  pollIntervalMs: 5_000,
  maxConcurrent: 3,
  processTimeoutMs: 30_000,
};

// ── Processor Event ──

export interface ProcessorEvent {
  type: 'item-start' | 'item-complete' | 'item-error' | 'item-conflict' | 'batch-start' | 'batch-complete';
  timestamp: string;
  itemId?: number;
  entityType?: string;
  entityId?: string;
  error?: string;
}
