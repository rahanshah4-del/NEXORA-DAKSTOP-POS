/**
 * Domain Shared Layer — barrel export.
 * Base interfaces that all domain services, validators,
 * policies, factories, commands, queries, and events extend.
 */

export type { IDomainService } from './IDomainService';
export type { IDomainValidator } from './IDomainValidator';
export type { IDomainPolicy, PolicySeverity } from './IDomainPolicy';
export type { IDomainFactory, IFactoryContext } from './IDomainFactory';
export type { ICommand, ICommandMetadata, ICommandResult } from './ICommand';
export type { IQuery, IQueryResult } from './IQuery';
export type { IDomainEventPayload, IDomainEventHandler } from './IDomainEvent';
export type {
  IValidationResult,
  IValidationError,
  IValidationWarning,
  IValidationRule,
  ValidationRules,
} from './IValidationResult';
export { ValidationResult } from './IValidationResult';
