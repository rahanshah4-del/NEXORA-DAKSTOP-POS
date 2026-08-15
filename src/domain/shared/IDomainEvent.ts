/**
 * IDomainEvent — base domain event interface.
 * Events represent facts that have occurred in the domain.
 * Immutable. Interface only. No implementation.
 */

import type { EntityType } from '../../sync/SyncTypes';

export interface IDomainEventPayload {
  /** Unique event identifier */
  eventId: string;

  /** Event type discriminator */
  eventType: string;

  /** ISO-8601 timestamp when the event occurred */
  occurredAt: string;

  /** Entity type affected */
  entityType: EntityType | string;

  /** Entity ID affected */
  entityId: string;

  /** User ID who caused the event */
  causedBy: string;

  /** Device ID where the event originated */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** The aggregate/entity version after this event */
  aggregateVersion: number;

  /** Event payload data */
  data: Record<string, unknown>;

  /** Optional correlation ID */
  correlationId: string | null;
}

export interface IDomainEventHandler<TEvent extends IDomainEventPayload = IDomainEventPayload> {
  /** The event type this handler processes */
  readonly eventType: string;

  /** Handle the domain event */
  handle(event: TEvent): Promise<void>;

  /** Whether this handler is currently active */
  isActive(): boolean;
}
