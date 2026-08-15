/**
 * Sync Service — orchestrates data synchronization between local SQLite and Firebase Firestore.
 * Stub — full implementation in Phase 2.
 */

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export const syncService = {
  async syncAll(): Promise<SyncResult> {
    return { success: true, pushed: 0, pulled: 0, conflicts: 0, errors: [] };
  },

  async pushChanges(): Promise<number> {
    return 0;
  },

  async pullChanges(): Promise<number> {
    return 0;
  },

  async resolveConflicts(): Promise<number> {
    return 0;
  },

  isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  },
};
