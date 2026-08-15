/**
 * OrderQueryHandlers.ts — Query handlers for Order-related queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { ILogger } from '../common/IApplicationService';
import type { Order } from '../../types/models';

export class OrderQueryHandlers {
  constructor(
    private _orderRepo: IOrderRepository,
    private _logger: ILogger,
  ) {}

  async getOrder(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const order = await this._orderRepo.findWithItems(query.orderId);
    return Result.ok(this._singleOrEmpty(order, query));
  }

  async getOrdersByTable(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByTable(query.tableId);
    return Result.ok(this._toPage(orders, query));
  }

  async getOrdersByStatus(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByStatus(query.status);
    return Result.ok(this._toPage(orders, query));
  }

  async getOrdersByDate(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByDateRange(query.startDate, query.endDate, {
      limit: query.limit,
      offset: query.offset,
      orderBy: query.sortBy,
      orderDir: query.sortDirection,
    });
    return Result.ok(this._toPage(orders, query));
  }

  async getActiveOrders(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const all = await this._orderRepo.findAll({ limit: 500, orderBy: 'created_at', orderDir: 'DESC' });
    const active = all.filter((o) => !['completed', 'cancelled'].includes(o.status));
    return Result.ok(this._toPage(active, query));
  }

  async getOrdersByCustomer(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByCustomer(query.customerId);
    return Result.ok(this._toPage(orders, query));
  }

  async getOrdersByType(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByType(query.orderType);
    return Result.ok(this._toPage(orders, query));
  }

  async getUnpaidOrders(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const orders = await this._orderRepo.findByPaymentStatus(query.paymentStatus ?? 'unpaid');
    return Result.ok(this._toPage(orders, query));
  }

  async searchOrders(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Order>>> {
    const all = await this._orderRepo.findAll({ limit: 500, orderBy: 'created_at', orderDir: 'DESC' });
    const q = (query.query ?? '').toLowerCase();
    const filtered = all.filter(
      (o) =>
        String(o.orderNumber).includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q) ||
        (o.tableName ?? '').toLowerCase().includes(q) ||
        (o.customerName ?? '').toLowerCase().includes(q),
    );
    return Result.ok(this._toPage(filtered, query));
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return {
      items: sliced,
      totalCount,
      offset,
      limit,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
      totalPages: Math.ceil(totalCount / limit),
      executionTimeMs: 0,
    };
  }

  private _singleOrEmpty<T>(item: T | null, query: any): PaginatedResult<T> {
    const items = item ? [item] : [];
    return { items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 };
  }
}
