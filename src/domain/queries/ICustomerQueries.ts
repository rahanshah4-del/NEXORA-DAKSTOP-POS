/**
 * Customer Query Interfaces.
 * CQRS queries for reading customer data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';
import type { Customer } from '../../types/models';

export interface IGetCustomerQuery extends IQuery<Customer> {
  customerId: string;
}

export interface ISearchCustomersQuery extends IQuery<Customer> {
  query: string;
}

export interface IGetTopCustomersQuery extends IQuery<Customer> {
  metric: 'spent' | 'orders';
  limit?: number;
}

export interface IGetCustomerOrdersQuery extends IQuery<Customer> {
  customerId: string;
}

export interface IGetCustomerByEmailQuery extends IQuery<Customer> {
  email: string;
}

export interface IGetCustomerByPhoneQuery extends IQuery<Customer> {
  phone: string;
}
