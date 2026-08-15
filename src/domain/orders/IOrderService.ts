/**
 * Order Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { ICommandResult } from '../shared/ICommand';
import type { Order, OrderItem } from '../../types/models';
import type {
  ICreateOrderCommand,
  IUpdateOrderCommand,
  ICancelOrderCommand,
  IRefundOrderCommand,
  ISplitBillCommand,
  IUpdateOrderStatusCommand,
  IAddOrderItemCommand,
  IRemoveOrderItemCommand,
  IUpdatePaymentStatusCommand,
} from '../commands/IOrderCommands';
import type {
  IOrderCreatedEvent,
  IOrderUpdatedEvent,
  IOrderPaidEvent,
  IOrderCancelledEvent,
  IOrderRefundedEvent,
  IOrderStatusChangedEvent,
  IOrderItemAddedEvent,
  IOrderItemRemovedEvent,
  IBillSplitEvent,
} from '../events/IDomainEvents';

// ── Service ──

export interface IOrderService extends IDomainService<Order, ICreateOrderCommand, IUpdateOrderCommand> {
  cancelOrder(command: ICancelOrderCommand): Promise<ICommandResult<Order>>;
  refundOrder(command: IRefundOrderCommand): Promise<ICommandResult<Order>>;
  splitBill(command: ISplitBillCommand): Promise<ICommandResult<Order[]>>;
  updateStatus(command: IUpdateOrderStatusCommand): Promise<ICommandResult<Order>>;
  addItem(command: IAddOrderItemCommand): Promise<ICommandResult<OrderItem>>;
  removeItem(command: IRemoveOrderItemCommand): Promise<ICommandResult<Order>>;
  updatePaymentStatus(command: IUpdatePaymentStatusCommand): Promise<ICommandResult<Order>>;
  getActiveOrders(): Promise<Order[]>;
  getOrdersByTable(tableId: string): Promise<Order[]>;
  getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]>;
  getNextOrderNumber(): Promise<number>;
}

// ── Validator ──

export interface IOrderValidator extends IDomainValidator<ICreateOrderCommand, Order> {
  validateCancel(command: ICancelOrderCommand, existing: Order): import('../shared/IValidationResult').IValidationResult;
  validateRefund(command: IRefundOrderCommand, existing: Order): import('../shared/IValidationResult').IValidationResult;
  validateSplit(command: ISplitBillCommand, existing: Order): import('../shared/IValidationResult').IValidationResult;
  validateAddItem(command: IAddOrderItemCommand, existing: Order): import('../shared/IValidationResult').IValidationResult;
  validateRemoveItem(command: IRemoveOrderItemCommand, existing: Order): import('../shared/IValidationResult').IValidationResult;
  validateStatusTransition(currentStatus: string, newStatus: string): import('../shared/IValidationResult').IValidationResult;
}

// ── Policy ──

export interface IOrderPolicy extends IDomainPolicy<Order> {
  canBeModified(order: Order): boolean;
  canBeCancelled(order: Order): boolean;
  canBeRefunded(order: Order): boolean;
  canBeSplit(order: Order): boolean;
  canAddItems(order: Order): boolean;
  requiresPaymentBeforeClose(order: Order): boolean;
  getMaxItemsPerOrder(): number;
  getAllowedStatusTransitions(): Record<string, string[]>;
}

// ── Factory ──

export interface IOrderFactory extends IDomainFactory<Order, ICreateOrderCommand> {
  createOrderItem(command: IAddOrderItemCommand, orderId: string): OrderItem;
  createSplitOrder(original: Order, items: OrderItem[], customerId: string | null): Order;
}

// ── Events ──

export interface IOrderEventPublisher {
  orderCreated(event: Omit<IOrderCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderUpdated(event: Omit<IOrderUpdatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderPaid(event: Omit<IOrderPaidEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderCancelled(event: Omit<IOrderCancelledEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderRefunded(event: Omit<IOrderRefundedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderStatusChanged(event: Omit<IOrderStatusChangedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderItemAdded(event: Omit<IOrderItemAddedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  orderItemRemoved(event: Omit<IOrderItemRemovedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  billSplit(event: Omit<IBillSplitEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
