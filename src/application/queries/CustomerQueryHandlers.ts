/**
 * CustomerQueryHandlers.ts — Query handlers for Customer queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { ICustomerRepository } from '../../repositories/ICustomerRepository';
import type { ILogger } from '../common/IApplicationService';
import type { Customer } from '../../types/models';

export class CustomerQueryHandlers {
  constructor(
    private _customerRepo: ICustomerRepository,
    private _logger: ILogger,
  ) {}

  async getCustomer(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Customer>>> {
    const customer = await this._customerRepo.findById(query.customerId);
    return Result.ok(this._single(customer, query));
  }

  async searchCustomers(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Customer>>> {
    const customers = await this._customerRepo.search(query.query, {
      limit: query.limit ?? 50,
      offset: query.offset,
    });
    return Result.ok(this._toPage(customers, query));
  }

  async getTopCustomers(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Customer>>> {
    const limit = query.limit ?? 10;
    const customers = query.metric === 'orders'
      ? await this._customerRepo.findTopByOrders(limit)
      : await this._customerRepo.findTopBySpent(limit);
    return Result.ok(this._toPage(customers, query));
  }

  async getCustomerOrders(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    return Result.ok({ items: [], totalCount: 0, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 0, executionTimeMs: 0 });
  }

  async getCustomerByEmail(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Customer>>> {
    const customer = await this._customerRepo.findByEmail(query.email);
    return Result.ok(this._single(customer, query));
  }

  async getCustomerByPhone(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Customer>>> {
    const customer = await this._customerRepo.findByPhone(query.phone);
    return Result.ok(this._single(customer, query));
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return { items: sliced, totalCount, offset, limit, hasNextPage: offset + limit < totalCount, hasPreviousPage: offset > 0, totalPages: Math.ceil(totalCount / limit), executionTimeMs: 0 };
  }

  private _single<T>(item: T | null, query: any): PaginatedResult<T> {
    const items = item ? [item] : [];
    return { items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 };
  }
}
