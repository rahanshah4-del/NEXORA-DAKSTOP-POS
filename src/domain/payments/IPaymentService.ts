/**
 * Payment Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { PaymentRecord } from '../../repositories/IPaymentRepository';
import type { IProcessPaymentCommand, IRefundPaymentCommand, IVoidPaymentCommand } from '../commands/IMiscCommands';
import type { IPaymentProcessedEvent, IPaymentRefundedEvent, IPaymentVoidedEvent } from '../events/IDomainEvents';

// Payment uses IProcessPaymentCommand for both create and update conceptually,
// so we use a minimal command shape for the base service contract.

interface IPaymentCreateCommand { orderId: string; amountCents: number; method: string; }
interface IPaymentUpdateCommand { paymentId: string; amountCents?: number; }

export interface IPaymentService extends IDomainService<PaymentRecord, IPaymentCreateCommand, IPaymentUpdateCommand> {
  processPayment(command: IProcessPaymentCommand): Promise<PaymentRecord>;
  refundPayment(command: IRefundPaymentCommand): Promise<PaymentRecord>;
  voidPayment(command: IVoidPaymentCommand): Promise<PaymentRecord>;
  getByOrder(orderId: string): Promise<PaymentRecord[]>;
  getTotalsByMethod(startDate: string, endDate: string): Promise<Record<string, number>>;
}

export interface IPaymentValidator extends IDomainValidator<IPaymentCreateCommand, PaymentRecord> {
  validateRefund(command: IRefundPaymentCommand, existing: PaymentRecord): import('../shared/IValidationResult').IValidationResult;
  validateVoid(command: IVoidPaymentCommand, existing: PaymentRecord): import('../shared/IValidationResult').IValidationResult;
  validateAmount(amountCents: number, orderTotalCents: number): import('../shared/IValidationResult').IValidationResult;
}

export interface IPaymentPolicy extends IDomainPolicy<PaymentRecord> {
  canRefund(payment: PaymentRecord): boolean;
  canVoid(payment: PaymentRecord): boolean;
  requiresManagerApproval(amountCents: number): boolean;
  getMaxRefundWindowHours(): number;
  getAllowedMethods(): string[];
}

export interface IPaymentFactory extends IDomainFactory<PaymentRecord, IPaymentCreateCommand> {
  createRefund(original: PaymentRecord, amountCents: number, reason: string): PaymentRecord;
}

export interface IPaymentEventPublisher {
  paymentProcessed(event: Omit<IPaymentProcessedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  paymentRefunded(event: Omit<IPaymentRefundedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  paymentVoided(event: Omit<IPaymentVoidedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
