/**
 * Offline Queue — queues operations performed while offline for later sync.
 * Stub — full implementation in Phase 2.
 */

export interface QueuedOperation {
  id: number;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string;
  createdAt: string;
  attempts: number;
}

export const offlineQueue = {
  async enqueue(tableName: string, recordId: string, operation: 'insert' | 'update' | 'delete', data: Record<string, unknown>): Promise<void> {
    // Future: insert into sync_queue table
  },

  async dequeueAll(): Promise<QueuedOperation[]> {
    return [];
  },

  async markProcessed(id: number): Promise<void> {
    // Future: remove from sync_queue
  },

  async markFailed(id: number, error: string): Promise<void> {
    // Future: increment attempts, set last_error
  },

  async getPendingCount(): Promise<number> {
    return 0;
  },
};
