/**
 * Order Query Interfaces.
 * CQRS queries for reading order data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';
import type { Order } from '../../types/models';
import type { OrderStatus, PaymentStatus, OrderType } from '../../types/enums';

export interface IGetOrderQuery extends IQuery<Order> {
  orderId: string;
}

export interface IGetOrdersByTableQuery extends IQuery<Order> {
  tableId: string;
}

export interface IGetOrdersByStatusQuery extends IQuery<Order> {
  status: OrderStatus;
}

export interface IGetOrdersByDateQuery extends IQuery<Order> {
  startDate: string;
  endDate: string;
}

export interface IGetActiveOrdersQuery extends IQuery<Order> {
  // Active = not completed or cancelled
}

export interface IGetOrdersByCustomerQuery extends IQuery<Order> {
  customerId: string;
}

export interface IGetOrdersByTypeQuery extends IQuery<Order> {
  orderType: OrderType;
}

export interface IGetUnpaidOrdersQuery extends IQuery<Order> {
  paymentStatus: PaymentStatus;
}

export interface ISearchOrdersQuery extends IQuery<Order> {
  query: string;
}
