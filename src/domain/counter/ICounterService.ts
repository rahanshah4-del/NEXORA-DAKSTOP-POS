/**
 * Counter (Cash Drawer) Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IOpenCounterCommand, ICloseCounterCommand } from '../commands/IMiscCommands';
import type { IDrawerOpenedEvent, IDrawerClosedEvent } from '../events/IDomainEvents';

export interface CashCounter {
  id: string;
  employeeId: string;
  employeeName: string;
  openingBalanceCents: number;
  closingBalanceCents: number | null;
  expectedBalanceCents: number | null;
  differenceCents: number | null;
  cashSalesCents: number;
  cashRefundsCents: number;
  paidInCents: number;
  paidOutCents: number;
  status: 'open' | 'closed';
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  createdAt: string;
}

export interface CounterTransaction {
  id: string;
  counterId: string;
  type: 'sale' | 'refund' | 'pay_in' | 'pay_out' | 'tip_in' | 'tip_out';
  amountCents: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface ICounterService {
  open(command: IOpenCounterCommand): Promise<CashCounter>;
  close(command: ICloseCounterCommand): Promise<CashCounter>;
  getActive(): Promise<CashCounter | null>;
  getHistory(startDate: string, endDate: string): Promise<CashCounter[]>;
  getCounter(id: string): Promise<CashCounter | null>;
  recordSale(counterId: string, amountCents: number, referenceId: string): Promise<void>;
  recordRefund(counterId: string, amountCents: number, referenceId: string): Promise<void>;
  recordPayIn(counterId: string, amountCents: number, reason: string): Promise<void>;
  recordPayOut(counterId: string, amountCents: number, reason: string): Promise<void>;
  getTransactions(counterId: string): Promise<CounterTransaction[]>;
  calculateExpectedBalance(counterId: string): Promise<number>;
}

export interface ICounterValidator {
  validateOpen(command: IOpenCounterCommand): import('../shared/IValidationResult').IValidationResult;
  validateClose(command: ICloseCounterCommand, counter: CashCounter): import('../shared/IValidationResult').IValidationResult;
  validatePayInOut(amountCents: number, reason: string): import('../shared/IValidationResult').IValidationResult;
  validateBalanceDifference(differenceCents: number): import('../shared/IValidationResult').IValidationResult;
}

export interface ICounterPolicy {
  maxDrawerOpenDurationMinutes(): number;
  maxBalanceDifferenceCents(): number;
  requiresManagerForLargePayOut(): boolean;
  largePayOutThresholdCents(): number;
  autoCloseAtEndOfDay(): boolean;
  requireCountVerification(): boolean;
}

export interface ICounterFactory {
  create(command: IOpenCounterCommand): CashCounter;
}

export interface ICounterEventPublisher {
  drawerOpened(event: Omit<IDrawerOpenedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  drawerClosed(event: Omit<IDrawerClosedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
