/**
 * Backup Domain — Service, Validator, Policy, Factory, Events.
 * Wraps the enterprise backup interfaces for domain-level access.
 * Interface only. No implementation.
 */

import type { IBackupManifest, BackupType } from '../../sync/enterprise/IBackup';
import type { IBackupCreatedEvent, IBackupRestoredEvent } from '../events/IDomainEvents';

export interface IBackupDomainService {
  createBackup(type: BackupType, label?: string, entityTypes?: string[]): Promise<IBackupManifest>;
  restoreBackup(backupId: string, createSafetyBackup: boolean): Promise<void>;
  verifyBackup(backupId: string): Promise<boolean>;
  listBackups(type?: BackupType): Promise<IBackupManifest[]>;
  deleteBackup(backupId: string): Promise<void>;
  pruneBackups(): Promise<number>;
  getStorageUsed(): Promise<number>;
  exportBackup(backupId: string, destinationPath: string): Promise<void>;
  importBackup(sourcePath: string): Promise<IBackupManifest>;
  validateRestore(backupId: string): Promise<boolean>;
}

export interface IBackupValidator {
  validateCreate(type: BackupType): import('../shared/IValidationResult').IValidationResult;
  validateRestore(backupId: string): import('../shared/IValidationResult').IValidationResult;
  validateExport(backupId: string, destinationPath: string): import('../shared/IValidationResult').IValidationResult;
  validateImport(sourcePath: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IBackupPolicy {
  automaticBackupsEnabled(): boolean;
  automaticIntervalMinutes(): number;
  maxAutomaticBackups(): number;
  maxManualBackups(): number;
  backupBeforeSyncEnabled(): boolean;
  compressionEnabled(): boolean;
  encryptionEnabled(): boolean;
  verifyAfterCreate(): boolean;
}

export interface IBackupEventPublisher {
  backupCreated(event: Omit<IBackupCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  backupRestored(event: Omit<IBackupRestoredEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
