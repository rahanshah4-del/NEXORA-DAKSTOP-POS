/**
 * IOrderRepository — repository interface for Orders.
 * Interface only. No implementation.
 */

import type { Order, OrderItem } from '../types/models';
import type { OrderStatus, PaymentStatus, OrderType } from '../types/enums';
import type { ISyncRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Order Repository Interface ──

export interface IOrderRepository extends ISyncRepository<Order> {
  /** Find orders by table ID */
  findByTable(tableId: string): Promise<Order[]>;

  /** Find orders by customer ID */
  findByCustomer(customerId: string): Promise<Order[]>;

  /** Find orders by status */
  findByStatus(status: OrderStatus): Promise<Order[]>;

  /** Find orders by order type */
  findByType(orderType: OrderType): Promise<Order[]>;

  /** Find orders by payment status */
  findByPaymentStatus(paymentStatus: PaymentStatus): Promise<Order[]>;

  /** Find orders created by a specific user */
  findByCreatedBy(userId: string): Promise<Order[]>;

  /** Find orders within a date range */
  findByDateRange(startDate: string, endDate: string, opts?: QueryOptions): Promise<Order[]>;

  /** Update order status */
  updateStatus(id: string, status: OrderStatus): Promise<void>;

  /** Cancel an order with a mandatory reason */
  cancelOrder(id: string, reason: string): Promise<void>;

  /** Update payment status */
  updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void>;

  /** Get order with items populated */
  findWithItems(id: string): Promise<Order | null>;

  /** Get the next order number */
  getNextOrderNumber(): Promise<number>;

  // ── Order Items ──

  /** Add an item to an order */
  addItem(orderId: string, item: Partial<OrderItem>): Promise<OrderItem>;

  /** Update an order item */
  updateItem(itemId: string, data: Partial<OrderItem>): Promise<OrderItem>;

  /** Remove an item from an order */
  removeItem(itemId: string): Promise<void>;

  /** Get all items for an order */
  getItems(orderId: string): Promise<OrderItem[]>;
}
