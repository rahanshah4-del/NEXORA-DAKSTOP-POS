/**
 * ReportQueryHandlers.ts — Query handlers for Report queries.
 *
 * Aggregates data from multiple repositories to generate reports.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { IProductRepository } from '../../repositories/IProductRepository';
import type { IPaymentRepository } from '../../repositories/IPaymentRepository';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { IStaffRepository } from '../../repositories/IStaffRepository';
import type { ICustomerRepository } from '../../repositories/ICustomerRepository';
import type { ILogger } from '../common/IApplicationService';
import type { Order } from '../../types/models';

export class ReportQueryHandlers {
  constructor(
    private _orderRepo: IOrderRepository,
    private _productRepo: IProductRepository,
    private _paymentRepo: IPaymentRepository,
    private _inventoryRepo: IInventoryRepository,
    private _staffRepo: IStaffRepository,
    private _customerRepo: ICustomerRepository,
    private _logger: ILogger,
  ) {}

  async getSalesReport(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const orders = await this._orderRepo.findByDateRange(query.startDate, query.endDate);
    const report = {
      totalOrders: orders.length,
      totalRevenueCents: orders.reduce((s, o) => s + (o.totalCents ?? 0), 0),
      averageOrderValueCents: orders.length > 0 ? orders.reduce((s, o) => s + (o.totalCents ?? 0), 0) / orders.length : 0,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return Result.ok({ items: [report], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getRevenueSummary(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const orders = await this._orderRepo.findAll({ limit: 1000 });
    const paid = orders.filter((o) => o.paymentStatus === 'paid');
    const summary = {
      totalRevenueCents: paid.reduce((s, o) => s + (o.totalCents ?? 0), 0),
      totalTaxCents: paid.reduce((s, o) => s + (o.taxCents ?? 0), 0),
      totalDiscountCents: paid.reduce((s, o) => s + (o.discountCents ?? 0), 0),
      orderCount: paid.length,
    };
    return Result.ok({ items: [summary], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getTopSellingProducts(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const products = await this._productRepo.findActive({ limit: 50 });
    const sorted = products.sort((a, b) => b.priceCents - a.priceCents).slice(0, query.limit ?? 10);
    return Result.ok({ items: sorted.map((p) => ({ productId: p.id, name: p.name, priceCents: p.priceCents })), totalCount: sorted.length, offset: 0, limit: query.limit ?? 10, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getPaymentMethodBreakdown(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const totals = await this._paymentRepo.getTotalByMethod(query.startDate ?? '2000-01-01', query.endDate ?? '2099-12-31');
    const breakdown = Array.from(totals.entries()).map(([method, total]) => ({ method, totalCents: total }));
    return Result.ok({ items: breakdown, totalCount: breakdown.length, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getEmployeePerformance(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const employees = await this._staffRepo.findActive();
    const orders = await this._orderRepo.findByDateRange(query.startDate ?? '2000-01-01', query.endDate ?? '2099-12-31');
    const perf = employees.map((emp) => ({
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      orderCount: orders.filter((o) => o.createdBy === emp.id).length,
      totalRevenueCents: orders.filter((o) => o.createdBy === emp.id).reduce((s, o) => s + (o.totalCents ?? 0), 0),
    }));
    return Result.ok({ items: perf, totalCount: perf.length, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getTableTurnover(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    return Result.ok({ items: [], totalCount: 0, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 0, executionTimeMs: 0 });
  }

  async getDailySummary(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const date = query.date ?? new Date().toISOString().split('T')[0];
    const orders = await this._orderRepo.findByDateRange(`${date} 00:00:00`, `${date} 23:59:59`);
    const summary = {
      date,
      totalOrders: orders.length,
      totalRevenueCents: orders.reduce((s, o) => s + (o.totalCents ?? 0), 0),
      completedOrders: orders.filter((o) => o.status === 'completed').length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
    };
    return Result.ok({ items: [summary], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  async getDashboardStats(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = await this._orderRepo.findByDateRange(`${today} 00:00:00`, `${today} 23:59:59`);
    const allOrders = await this._orderRepo.findAll({ limit: 1000 });
    const products = await this._productRepo.findAll();
    const customers = await this._customerRepo.findAll();

    const stats = {
      todayRevenueCents: todayOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0),
      todayOrderCount: todayOrders.length,
      totalProductCount: products.length,
      totalCustomerCount: customers.length,
      pendingOrders: todayOrders.filter((o) => !['completed', 'cancelled'].includes(o.status)).length,
    };
    return Result.ok({ items: [stats], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }
}
