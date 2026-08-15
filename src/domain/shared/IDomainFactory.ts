/**
 * IDomainFactory — base domain factory interface.
 * Factories encapsulate entity creation logic and defaults.
 * Interface only. No implementation.
 */

import type { IDeviceIdentity } from '../../sync/enterprise/IDeviceIdentity';
import type { IBranchMetadata } from '../../sync/enterprise/IBranchMetadata';

export interface IDomainFactory<TEntity, TCreateCommand> {
  /** Create a new entity instance from a command with all defaults applied */
  create(command: TCreateCommand, context: IFactoryContext): TEntity;

  /** Create a prototype/stub entity for preview purposes */
  createPreview(command: Partial<TCreateCommand>): Partial<TEntity>;

  /** Generate a unique ID for a new entity */
  generateId(): string;

  /** Apply default values to a partial entity */
  applyDefaults(partial: Partial<TEntity>): TEntity;
}

export interface IFactoryContext {
  deviceId: string;
  workspaceId: string;
  branchId: string;
  userId: string;
  timestamp: string;
}
