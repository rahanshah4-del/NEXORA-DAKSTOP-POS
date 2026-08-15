/**
 * Sync Domain — Service, Validator, Policy, Factory, Events.
 * Domain-level sync orchestration interface.
 * Interface only. No implementation.
 */

import type { SyncResult, SyncConfig, EntityType, QueueStats } from '../../sync/SyncTypes';
import type { ILastSyncState } from '../../sync/enterprise/ISyncMetadata';
import type { ISyncHealthSnapshot } from '../../sync/enterprise/ISyncHealth';
import type { ISyncStartedEvent, ISyncCompletedEvent, ISyncFailedEvent, IConflictDetectedEvent, IConflictResolvedEvent } from '../events/IDomainEvents';

export interface ISyncDomainService {
  startSync(sessionType?: string, entityTypes?: EntityType[]): Promise<SyncResult>;
  pushChanges(entityTypes?: EntityType[]): Promise<number>;
  pullChanges(entityTypes?: EntityType[]): Promise<number>;
  resolveConflicts(strategy?: string): Promise<number>;
  cancelSync(): Promise<void>;
  isSyncing(): boolean;
  getConfig(): SyncConfig;
  updateConfig(config: Partial<SyncConfig>): Promise<void>;
  getLastSyncState(): ILastSyncState;
  getQueueStats(): Promise<QueueStats>;
  getHealth(): Promise<ISyncHealthSnapshot>;
  retryFailed(): Promise<number>;
  clearQueue(): Promise<void>;
  resetSync(): Promise<void>;
}

export interface ISyncValidator {
  validateStart(entityTypes?: EntityType[]): import('../shared/IValidationResult').IValidationResult;
  validateConfig(config: Partial<SyncConfig>): import('../shared/IValidationResult').IValidationResult;
  validateReset(): import('../shared/IValidationResult').IValidationResult;
}

export interface ISyncPolicy {
  syncIntervalMs(): number;
  maxBatchSize(): number;
  maxRetries(): number;
  conflictStrategy(): string;
  syncOnReconnect(): boolean;
  syncBeforeClose(): boolean;
  enabledEntityTypes(): EntityType[];
}

export interface ISyncEventPublisher {
  syncStarted(event: Omit<ISyncStartedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  syncCompleted(event: Omit<ISyncCompletedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  syncFailed(event: Omit<ISyncFailedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  conflictDetected(event: Omit<IConflictDetectedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  conflictResolved(event: Omit<IConflictResolvedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
