/**
 * IEventBus — enterprise event bus interfaces for sync events.
 *
 * Provides a typed publish/subscribe system for decoupled
 * communication between sync components and the UI layer.
 *
 * Interface only. No implementation.
 */

import type {
  EntityType,
  SyncOperation,
  SyncItemStatus,
  NetworkStatus,
  ConflictRecord,
  SyncResult,
} from '../SyncTypes';

// ── Event Type Registry ──

export interface ISyncEventMap {
  /** Fired when a synchronized entity is created, updated, or deleted locally */
  'entity:changed': IEntityChangedEvent;

  /** Fired when a sync cycle starts */
  'sync:started': ISyncStartedEvent;

  /** Fired when a sync cycle completes */
  'sync:completed': ISyncCompletedEvent;

  /** Fired when a sync cycle fails */
  'sync:failed': ISyncFailedEvent;

  /** Fired when a data conflict is detected */
  'conflict:detected': IConflictDetectedEvent;

  /** Fired when a data conflict is resolved */
  'conflict:resolved': IConflictResolvedEvent;

  /** Fired when network status changes */
  'network:changed': INetworkChangedEvent;

  /** Fired when the sync queue is updated */
  'queue:updated': IQueueUpdatedEvent;

  /** Fired when branch metadata changes */
  'branch:changed': IBranchChangedEvent;

  /** Fired when a sync watermark is updated */
  'watermark:updated': IWatermarkUpdatedEvent;

  /** Fired when the device is registered or re-registered */
  'device:registered': IDeviceRegisteredEvent;

  /** Fired when a backup is created */
  'backup:created': IBackupCreatedEvent;

  /** Fired when a backup is restored */
  'backup:restored': IBackupRestoredEvent;

  /** Fired when a health alert is raised */
  'health:alert': IHealthAlertEvent;
}

// ── Event Envelope ──

export interface ISyncEventEnvelope<K extends keyof ISyncEventMap = keyof ISyncEventMap> {
  /** Event type key */
  type: K;

  /** Unique event identifier */
  eventId: string;

  /** ISO-8601 event timestamp */
  timestamp: string;

  /** Event payload */
  payload: ISyncEventMap[K];

  /** Originating component */
  source: string;

  /** Correlation ID for tracing related events */
  correlationId: string | null;
}

// ── Entity Changed Event ──

export interface IEntityChangedEvent {
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  version: number;
  changedBy: string;
  deviceId: string;
  workspaceId: string;
  branchId: string;
  timestamp: string;
}

// ── Sync Started Event ──

export interface ISyncStartedEvent {
  sessionId: string;
  sessionType: 'full' | 'push-only' | 'pull-only' | 'entity-specific' | 'manual' | 'scheduled';
  triggeredBy: 'auto' | 'manual' | 'reconnect' | 'schedule';
  deviceId: string;
  workspaceId: string;
  branchId: string;
}

// ── Sync Completed Event ──

export interface ISyncCompletedEvent {
  sessionId: string;
  result: SyncResult;
  durationMs: number;
  deviceId: string;
  workspaceId: string;
  branchId: string;
}

// ── Sync Failed Event ──

export interface ISyncFailedEvent {
  sessionId: string;
  error: string;
  durationMs: number;
  deviceId: string;
  workspaceId: string;
  branchId: string;
}

// ── Conflict Detected Event ──

export interface IConflictDetectedEvent {
  conflict: ConflictRecord;
  sessionId: string;
  deviceId: string;
}

// ── Conflict Resolved Event ──

export interface IConflictResolvedEvent {
  conflictId: string;
  entityType: EntityType;
  entityId: string;
  resolution: 'local-wins' | 'remote-wins' | 'merge' | 'manual';
  resolvedBy: string;
  deviceId: string;
}

// ── Network Changed Event ──

export interface INetworkChangedEvent {
  previousStatus: NetworkStatus;
  currentStatus: NetworkStatus;
  latencyMs: number | null;
  deviceId: string;
}

// ── Queue Updated Event ──

export interface IQueueUpdatedEvent {
  totalPending: number;
  totalProcessing: number;
  totalFailed: number;
  totalConflict: number;
  lastItemEnqueuedAt: string | null;
  lastItemProcessedAt: string | null;
}

// ── Branch Changed Event ──

export interface IBranchChangedEvent {
  previousBranchId: string | null;
  currentBranchId: string;
  changedBy: string;
  deviceId: string;
  changeType: 'initialized' | 'switched' | 'updated' | 'deactivated';
}

// ── Watermark Updated Event ──

export interface IWatermarkUpdatedEvent {
  entityType: EntityType;
  direction: 'push' | 'pull';
  cursor: string | null;
  version: number;
  deviceId: string;
}

// ── Device Registered Event ──

export interface IDeviceRegisteredEvent {
  deviceId: string;
  workspaceId: string;
  branchId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
}

// ── Backup Created Event ──

export interface IBackupCreatedEvent {
  backupId: string;
  backupType: 'local' | 'automatic' | 'manual';
  sizeBytes: number;
  entityCount: number;
  deviceId: string;
}

// ── Backup Restored Event ──

export interface IBackupRestoredEvent {
  backupId: string;
  restoredBy: string;
  entityCount: number;
  durationMs: number;
  deviceId: string;
}

// ── Health Alert Event ──

export interface IHealthAlertEvent {
  alertId: string;
  component: 'queue' | 'network' | 'database' | 'sync' | 'device';
  previousStatus: string;
  currentStatus: string;
  message: string;
  deviceId: string;
}

// ── Event Bus Interface ──

export interface IEventBus {
  /** Publish an event to all subscribers */
  publish<K extends keyof ISyncEventMap>(
    type: K,
    payload: ISyncEventMap[K],
    source?: string,
    correlationId?: string | null,
  ): void;

  /** Subscribe to a specific event type */
  subscribe<K extends keyof ISyncEventMap>(
    type: K,
    callback: (envelope: ISyncEventEnvelope<K>) => void,
  ): () => void;

  /** Subscribe to all events (wildcard) */
  subscribeAll(callback: (envelope: ISyncEventEnvelope) => void): () => void;

  /** Subscribe to events matching a filter */
  subscribeFiltered(
    filter: IEventFilter,
    callback: (envelope: ISyncEventEnvelope) => void,
  ): () => void;

  /** Get the count of active subscribers */
  subscriberCount(type?: keyof ISyncEventMap): number;

  /** Remove all subscribers */
  clearAllSubscribers(): void;

  /** Pause event delivery */
  pause(): void;

  /** Resume event delivery */
  resume(): void;

  /** Check if the bus is paused */
  isPaused(): boolean;
}

// ── Event Filter ──

export interface IEventFilter {
  types?: Array<keyof ISyncEventMap>;
  entityTypes?: EntityType[];
  entityIds?: string[];
  sources?: string[];
  correlationId?: string;
  since?: string;
}

// ── Event Subscription Token ──

export interface IEventSubscription {
  id: string;
  type: keyof ISyncEventMap | '*';
  createdAt: string;
  unsubscribe: () => void;
}
