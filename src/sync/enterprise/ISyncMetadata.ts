/**
 * ISyncMetadata — sync session and tracking metadata interfaces.
 *
 * Tracks the state of every synchronization cycle for
 * observability, diagnostics, and incremental sync optimization.
 *
 * Interface only. No implementation.
 */

import type { EntityType, SyncResult } from '../SyncTypes';

// ── Sync Session ──

export interface ISyncSession {
  /** Unique session identifier (UUID) */
  sessionId: string;

  /** The device that initiated this session */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** Session type */
  sessionType: SyncSessionType;

  /** ISO-8601 session start */
  startedAt: string;

  /** ISO-8601 session end, null if in progress */
  completedAt: string | null;

  /** Session status */
  status: SyncSessionStatus;

  /** Results per entity type */
  entityResults: Map<EntityType, IEntitySyncResult>;

  /** Aggregate result */
  aggregateResult: SyncResult | null;

  /** Error that caused session failure, if any */
  fatalError: string | null;
}

export type SyncSessionType = 'full' | 'push-only' | 'pull-only' | 'entity-specific' | 'manual' | 'scheduled';
export type SyncSessionStatus = 'in-progress' | 'completed' | 'failed' | 'cancelled' | 'partial';

// ── Per-Entity Sync Result ──

export interface IEntitySyncResult {
  entityType: EntityType;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

// ── Sync Timeline (historical record) ──

export interface ISyncTimelineEntry {
  id: number;
  sessionId: string;
  sessionType: SyncSessionType;
  status: SyncSessionStatus;
  pushed: number;
  pulled: number;
  conflicts: number;
  errorCount: number;
  durationMs: number;
  timestamp: string;
}

// ── Last Sync State ──

export interface ILastSyncState {
  /** ISO-8601 of the last successful full sync */
  lastFullSyncAt: string | null;

  /** ISO-8601 of the last successful push */
  lastPushAt: string | null;

  /** ISO-8601 of the last successful pull */
  lastPullAt: string | null;

  /** ISO-8601 of the last successful sync of any type */
  lastSuccessfulSyncAt: string | null;

  /** ISO-8601 of the last failed sync attempt */
  lastFailedSyncAt: string | null;

  /** Error message from the last failure */
  lastErrorMessage: string | null;

  /** Total successful syncs since installation */
  totalSuccessfulSyncs: number;

  /** Total failed syncs since installation */
  totalFailedSyncs: number;

  /** Current sync session, null if idle */
  currentSession: ISyncSession | null;
}

// ── Sync Watermark (per entity type, for incremental sync) ──

export interface ISyncWatermark {
  entityType: EntityType;
  lastPulledAt: string | null;
  lastPulledVersion: number | null;
  lastPushedAt: string | null;
  lastPushedVersion: number | null;
  lastCursor: string | null;
  updatedAt: string;
}

// ── Sync Metadata Provider Interface ──

export interface ISyncMetadataProvider {
  /** Get the last sync state */
  getLastSyncState(): ILastSyncState;

  /** Get sync watermarks for all entity types */
  getWatermarks(): Map<EntityType, ISyncWatermark>;

  /** Get the watermark for a specific entity type */
  getWatermark(entityType: EntityType): ISyncWatermark | null;

  /** Update a watermark after a successful pull */
  updatePullWatermark(entityType: EntityType, cursor: string, version: number): Promise<void>;

  /** Update a watermark after a successful push */
  updatePushWatermark(entityType: EntityType, version: number): Promise<void>;

  /** Record the start of a new sync session */
  beginSession(
    sessionType: SyncSessionType,
    workspaceId: string,
    branchId: string,
    deviceId: string,
  ): Promise<ISyncSession>;

  /** Record the completion of a sync session */
  completeSession(sessionId: string, result: SyncResult): Promise<void>;

  /** Record a failed sync session */
  failSession(sessionId: string, error: string): Promise<void>;

  /** Get recent timeline entries */
  getTimeline(limit?: number): Promise<ISyncTimelineEntry[]>;

  /** Get timeline entries within a date range */
  getTimelineByDateRange(startDate: string, endDate: string): Promise<ISyncTimelineEntry[]>;

  /** Reset all watermarks (for full re-sync) */
  resetAllWatermarks(): Promise<void>;
}
