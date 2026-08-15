/**
 * Conflict Resolver — strategies for resolving data conflicts during sync.
 * Stub — full implementation in Phase 2.
 */

export type ConflictStrategy = 'last-write-wins' | 'local-wins' | 'remote-wins' | 'merge';

export interface ConflictRecord {
  tableName: string;
  recordId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  resolvedAt?: string;
  strategy: ConflictStrategy;
}

export const conflictResolver = {
  async detectConflicts(): Promise<ConflictRecord[]> {
    return [];
  },

  async resolve(conflict: ConflictRecord, strategy: ConflictStrategy): Promise<void> {
    // Future: apply resolution strategy
  },

  getDefaultStrategy(): ConflictStrategy {
    return 'last-write-wins';
  },
};
