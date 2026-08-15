/**
 * IBackup — enterprise backup and restore interfaces.
 *
 * Provides local data backup capabilities for the POS terminal,
 * ensuring data durability during offline operation and disaster
 * recovery scenarios.
 *
 * Interface only. No implementation.
 */

import type { EntityType } from '../SyncTypes';

// ── Backup Manifest ──

export interface IBackupManifest {
  /** Unique backup identifier */
  backupId: string;

  /** Human-readable backup label */
  label: string;

  /** Backup type */
  backupType: BackupType;

  /** ISO-8601 when the backup was created */
  createdAt: string;

  /** Device ID where the backup was created */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** Application version at backup time */
  appVersion: string;

  /** Sync protocol version at backup time */
  syncProtocolVersion: number;

  /** Total size of the backup in bytes */
  totalSizeBytes: number;

  /** Total number of entities across all types */
  totalEntityCount: number;

  /** Per-entity-type record counts */
  entityCounts: Partial<Record<EntityType, number>>;

  /** SHA-256 checksum of the entire backup archive */
  checksum: string;

  /** Compression algorithm used */
  compression: BackupCompression;

  /** Whether the backup is encrypted */
  encrypted: boolean;

  /** Encryption algorithm used (if encrypted) */
  encryptionAlgorithm: string | null;

  /** Whether integrity verification passed */
  integrityVerified: boolean;

  /** ISO-8601 when integrity was last verified */
  lastVerifiedAt: string | null;

  /** Additional metadata */
  metadata: Record<string, string>;
}

// ── Backup Types ──

export type BackupType = 'local' | 'automatic' | 'manual' | 'pre-sync' | 'pre-migration' | 'pre-restore';
export type BackupCompression = 'none' | 'gzip' | 'zstd';
export type BackupStatus = 'in-progress' | 'completed' | 'failed' | 'corrupted' | 'restored';

// ── Backup Configuration ──

export interface IBackupConfig {
  /** Whether automatic backups are enabled */
  automaticBackupsEnabled: boolean;

  /** Interval between automatic backups in minutes */
  automaticIntervalMinutes: number;

  /** Maximum number of automatic backups to retain */
  maxAutomaticBackups: number;

  /** Maximum number of manual backups to retain */
  maxManualBackups: number;

  /** Whether to create a backup before each sync cycle */
  backupBeforeSync: boolean;

  /** Whether to compress backups */
  compressionEnabled: boolean;

  /** Compression algorithm to use */
  compression: BackupCompression;

  /** Whether to encrypt backups */
  encryptionEnabled: boolean;

  /** Directory path for backup storage */
  storagePath: string;

  /** Whether to verify backup integrity after creation */
  verifyAfterCreate: boolean;
}

// ── Backup Record (tracking entry) ──

export interface IBackupRecord {
  backupId: string;
  manifest: IBackupManifest;
  filePath: string;
  status: BackupStatus;
  error: string | null;
  createdAt: string;
  restoredAt: string | null;
  restoredBy: string | null;
  deletedAt: string | null;
}

// ── Restore Metadata ──

export interface IRestoreMetadata {
  /** Unique restore operation identifier */
  restoreId: string;

  /** Backup ID being restored from */
  backupId: string;

  /** ISO-8601 when the restore started */
  startedAt: string;

  /** ISO-8601 when the restore completed */
  completedAt: string | null;

  /** Restore status */
  status: RestoreStatus;

  /** User ID who initiated the restore */
  initiatedBy: string;

  /** Device ID where restore is performed */
  deviceId: string;

  /** Total number of entities to restore */
  totalEntities: number;

  /** Number of entities restored so far */
  entitiesRestored: number;

  /** Number of entities that failed to restore */
  entitiesFailed: number;

  /** Error message if restore failed */
  error: string | null;

  /** Whether a pre-restore safety backup was created */
  safetyBackupCreated: boolean;

  /** Safety backup ID (if created) */
  safetyBackupId: string | null;
}

export type RestoreStatus = 'in-progress' | 'completed' | 'failed' | 'rolled-back';

// ── Pre-Restore Validation ──

export interface IPreRestoreValidation {
  /** Whether the backup file exists and is readable */
  fileAccessible: boolean;

  /** Whether the backup checksum is valid */
  checksumValid: boolean;

  /** Whether the sync protocol version is compatible */
  protocolCompatible: boolean;

  /** Whether the app version is compatible */
  appVersionCompatible: boolean;

  /** Whether there is sufficient disk space */
  sufficientDiskSpace: boolean;

  /** Whether any active sync is paused */
  syncPaused: boolean;

  /** Whether the database is not currently in use */
  databaseAvailable: boolean;

  /** Overall validation result */
  canProceed: boolean;

  /** Warnings (non-blocking issues) */
  warnings: string[];

  /** Errors (blocking issues) */
  errors: string[];
}

// ── Backup Provider Interface ──

export interface IBackupProvider {
  /** Create a new backup */
  createBackup(
    type: BackupType,
    label?: string,
    entityTypes?: EntityType[],
  ): Promise<IBackupManifest>;

  /** Get a list of all available backups */
  listBackups(type?: BackupType): Promise<IBackupRecord[]>;

  /** Get a specific backup record */
  getBackup(backupId: string): Promise<IBackupRecord | null>;

  /** Verify the integrity of a backup */
  verifyIntegrity(backupId: string): Promise<boolean>;

  /** Validate whether a backup can be restored */
  validateRestore(backupId: string): Promise<IPreRestoreValidation>;

  /** Restore from a backup */
  restore(
    backupId: string,
    initiatedBy: string,
    createSafetyBackup?: boolean,
  ): Promise<IRestoreMetadata>;

  /** Roll back a failed restore */
  rollbackRestore(restoreId: string): Promise<void>;

  /** Delete a backup */
  deleteBackup(backupId: string): Promise<void>;

  /** Prune old backups according to retention policy */
  pruneBackups(): Promise<number>;

  /** Get the current backup configuration */
  getConfig(): IBackupConfig;

  /** Update the backup configuration */
  updateConfig(config: Partial<IBackupConfig>): Promise<void>;

  /** Get the total storage used by backups in bytes */
  getStorageUsed(): Promise<number>;

  /** Export a backup to an external path */
  exportBackup(backupId: string, destinationPath: string): Promise<void>;

  /** Import a backup from an external path */
  importBackup(sourcePath: string): Promise<IBackupManifest>;
}
