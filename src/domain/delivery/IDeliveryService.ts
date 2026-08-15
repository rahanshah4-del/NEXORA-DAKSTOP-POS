/**
 * Delivery Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { ICreateDeliveryCommand, IUpdateDeliveryStatusCommand, IAssignDriverCommand } from '../commands/IMiscCommands';
import type { IDeliveryCreatedEvent, IDeliveryStatusChangedEvent } from '../events/IDomainEvents';

export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';

export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: number;
  address: string;
  contactName: string;
  contactPhone: string;
  instructions: string | null;
  estimatedMinutes: number;
  driverId: string | null;
  driverName: string | null;
  status: DeliveryStatus;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IDeliveryService {
  create(command: ICreateDeliveryCommand): Promise<Delivery>;
  updateStatus(command: IUpdateDeliveryStatusCommand): Promise<Delivery>;
  assignDriver(command: IAssignDriverCommand): Promise<Delivery>;
  findById(id: string): Promise<Delivery | null>;
  getByOrder(orderId: string): Promise<Delivery | null>;
  getActive(): Promise<Delivery[]>;
  getByDate(date: string): Promise<Delivery[]>;
  getByDriver(driverId: string): Promise<Delivery[]>;
  estimateDeliveryTime(address: string): Promise<number>;
}

export interface IDeliveryValidator {
  validateCreate(command: ICreateDeliveryCommand): import('../shared/IValidationResult').IValidationResult;
  validateStatusTransition(current: DeliveryStatus, next: DeliveryStatus): import('../shared/IValidationResult').IValidationResult;
  validateDriverAssignment(driverId: string): import('../shared/IValidationResult').IValidationResult;
  validateAddress(address: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IDeliveryPolicy {
  maxDeliveryRadiusKm(): number;
  defaultEstimatedMinutes(): number;
  statusFlow(): DeliveryStatus[];
  allowedStatusTransitions(): Record<DeliveryStatus, DeliveryStatus[]>;
  autoAssignEnabled(): boolean;
}

export interface IDeliveryFactory {
  create(command: ICreateDeliveryCommand): Delivery;
}

export interface IDeliveryEventPublisher {
  deliveryCreated(event: Omit<IDeliveryCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  deliveryStatusChanged(event: Omit<IDeliveryStatusChangedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
