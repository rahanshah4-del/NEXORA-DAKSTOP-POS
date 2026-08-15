/**
 * ICommand — base CQRS command interface.
 * Commands express intent to mutate state.
 * Interface only. No implementation.
 */

export interface ICommand {
  /** Unique command identifier (UUID, for idempotency) */
  commandId: string;

  /** ISO-8601 timestamp when the command was issued */
  issuedAt: string;

  /** User ID who issued the command */
  issuedBy: string;

  /** Device ID where the command originated */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** Optional correlation ID for tracing */
  correlationId: string | null;
}

export interface ICommandMetadata {
  commandId: string;
  commandType: string;
  issuedAt: string;
  issuedBy: string;
  deviceId: string;
}

export interface ICommandResult<TEntity = unknown> {
  /** Whether the command succeeded */
  success: boolean;

  /** The resulting entity (if applicable) */
  entity: TEntity | null;

  /** Error message if failed */
  error: string | null;

  /** Validation errors if validation failed */
  validationErrors: string[];

  /** Domain events raised by this command */
  events: IDomainEventPayload[];
}

import type { IDomainEventPayload } from './IDomainEvent';
