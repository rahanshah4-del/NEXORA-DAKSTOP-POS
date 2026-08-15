/**
 * IDomainValidator — base domain validator interface.
 * All domain validators extend this contract.
 * Interface only. No implementation.
 */

import type { IValidationResult } from './IValidationResult';

export interface IDomainValidator<TCommand, TEntity = unknown> {
  /** Validate a create command — returns validation result */
  validateCreate(command: TCommand): IValidationResult;

  /** Validate an update command against the existing entity */
  validateUpdate(command: TCommand, existing: TEntity): IValidationResult;

  /** Validate a delete operation */
  validateDelete(id: string, existing: TEntity): IValidationResult;

  /** Validate arbitrary business rules against an entity */
  validate(entity: TEntity, context?: Record<string, unknown>): IValidationResult;
}
