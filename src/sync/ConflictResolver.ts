/**
 * ConflictResolver — detects and resolves data conflicts during sync.
 * Interface only. No implementation.
 */

import type { ConflictRecord, ConflictStrategy, EntityType } from './SyncTypes';

// ── Conflict Resolver Interface ──

export interface IConflictResolver {
  /** Detect conflicts between local and remote versions of a record */
  detectConflict(
    entityType: EntityType,
    entityId: string,
    localVersion: Record<string, unknown>,
    remoteVersion: Record<string, unknown>,
  ): boolean;

  /** Resolve a single conflict using the specified strategy */
  resolve(
    conflict: ConflictRecord,
    strategy: ConflictStrategy,
  ): Record<string, unknown>;

  /** Resolve multiple conflicts in batch */
  resolveBatch(
    conflicts: ConflictRecord[],
    defaultStrategy?: ConflictStrategy,
  ): Map<string, Record<string, unknown>>;

  /** Get the default conflict resolution strategy */
  getDefaultStrategy(): ConflictStrategy;

  /** Register a custom merge handler for a specific entity type */
  registerMergeHandler(
    entityType: EntityType,
    handler: (local: Record<string, unknown>, remote: Record<string, unknown>) => Record<string, unknown>,
  ): void;

  /** Get the registered merge handler for an entity type */
  getMergeHandler(
    entityType: EntityType,
  ): ((local: Record<string, unknown>, remote: Record<string, unknown>) => Record<string, unknown>) | null;
}

// ── Conflict Detection Result ──

export interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingFields: string[];
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  lastModifiedLocal: string | null;
  lastModifiedRemote: string | null;
}

// ── Resolution Outcome ──

export interface ResolutionOutcome {
  conflictId: string;
  entityType: EntityType;
  entityId: string;
  strategy: ConflictStrategy;
  resolvedData: Record<string, unknown>;
  resolvedAt: string;
}
