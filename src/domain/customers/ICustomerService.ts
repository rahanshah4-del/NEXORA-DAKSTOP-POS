/**
 * Customer Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { Customer } from '../../types/models';
import type { ICreateCustomerCommand, IUpdateCustomerCommand } from '../commands/ICustomerCommands';
import type { ICustomerCreatedEvent, ICustomerUpdatedEvent } from '../events/IDomainEvents';

export interface ICustomerService extends IDomainService<Customer, ICreateCustomerCommand, IUpdateCustomerCommand> {
  findByEmail(email: string): Promise<Customer | null>;
  findByPhone(phone: string): Promise<Customer | null>;
  search(query: string): Promise<Customer[]>;
  getTopBySpending(limit: number): Promise<Customer[]>;
  updateStats(customerId: string, orderTotalCents: number): Promise<void>;
}

export interface ICustomerValidator extends IDomainValidator<ICreateCustomerCommand, Customer> {
  validateEmail(email: string | null): import('../shared/IValidationResult').IValidationResult;
  validatePhone(phone: string | null): import('../shared/IValidationResult').IValidationResult;
}

export interface ICustomerPolicy extends IDomainPolicy<Customer> {
  isDuplicate(customer: Customer, existing: Customer[]): boolean;
  requiresPhoneOrEmail(customer: Customer): boolean;
  getMinNameLength(): number;
}

export interface ICustomerFactory extends IDomainFactory<Customer, ICreateCustomerCommand> {
  createWalkInCustomer(): Customer;
}

export interface ICustomerEventPublisher {
  customerCreated(event: Omit<ICustomerCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  customerUpdated(event: Omit<ICustomerUpdatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
