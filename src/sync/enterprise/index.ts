/**
 * Enterprise Sync Module — barrel export.
 *
 * Production-enterprise interfaces extending the core sync architecture.
 * All interfaces only. No implementation.
 */

// ── Entity Versioning ──
export type {
  IVersionedEntity,
  IVersionedEntityMetadata,
  IVersionChange,
  ISyncVersionPolicy,
  IEntityTombstone,
} from './IEntityVersioning';

// ── Device Identity ──
export type {
  IDeviceIdentity,
  IDeviceOsInfo,
  IDeviceIdentityProvider,
  IDeviceRegistrationPayload,
  IDeviceRegistrationStatus,
  IDeviceStorage,
  DeviceType,
} from './IDeviceIdentity';

// ── Sync Metadata ──
export type {
  ISyncSession,
  IEntitySyncResult,
  ISyncTimelineEntry,
  ILastSyncState,
  ISyncWatermark,
  ISyncMetadataProvider,
  SyncSessionType,
  SyncSessionStatus,
} from './ISyncMetadata';

// ── Branch Metadata ──
export type {
  IBranchMetadata,
  IBranchAddress,
  IBranchContact,
  IBranchConfig,
  IBranchLocalization,
  IBranchBusinessHours,
  IBranchHoliday,
  IBranchSpecialHours,
  IBranchNumberFormat,
  IBranchMetadataProvider,
} from './IBranchMetadata';

// ── Audit ──
export type {
  IAuditRecord,
  IAuditFilter,
  IAuditSummary,
  IAuditProvider,
  IAuditRetentionPolicy,
  AuditOperation,
  AuditOrigin,
} from './IAudit';

// ── Sync Health ──
export type {
  ISyncHealthSnapshot,
  IQueueHealth,
  INetworkHealth,
  IDatabaseHealth,
  ISyncEngineHealth,
  IDeviceHealth,
  ISyncHealthProvider,
  IHealthAlert,
  HealthStatus,
} from './ISyncHealth';

// ── Event Bus ──
export type {
  ISyncEventMap,
  ISyncEventEnvelope,
  IEntityChangedEvent,
  ISyncStartedEvent,
  ISyncCompletedEvent,
  ISyncFailedEvent,
  IConflictDetectedEvent,
  IConflictResolvedEvent,
  INetworkChangedEvent,
  IQueueUpdatedEvent,
  IBranchChangedEvent,
  IWatermarkUpdatedEvent,
  IDeviceRegisteredEvent,
  IBackupCreatedEvent,
  IBackupRestoredEvent,
  IHealthAlertEvent,
  IEventBus,
  IEventFilter,
  IEventSubscription,
} from './IEventBus';

// ── Backup ──
export type {
  IBackupManifest,
  IBackupConfig,
  IBackupRecord,
  IRestoreMetadata,
  IPreRestoreValidation,
  IBackupProvider,
  BackupType,
  BackupCompression,
  BackupStatus,
  RestoreStatus,
} from './IBackup';
