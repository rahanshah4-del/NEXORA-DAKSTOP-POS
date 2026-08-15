/**
 * MiscQueryHandlers.ts — Query handlers for miscellaneous cross-cutting queries.
 *
 * Covers: Staff, Tables, Payments, Auth, Sync, Counter queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { IStaffRepository } from '../../repositories/IStaffRepository';
import type { ITableRepository } from '../../repositories/ITableRepository';
import type { IPaymentRepository, PaymentRecord } from '../../repositories/IPaymentRepository';
import type { ISettingsRepository } from '../../repositories/ISettingsRepository';
import type { ILogger } from '../common/IApplicationService';
import type { Employee, Shift, Table } from '../../types/models';

export class MiscQueryHandlers {
  constructor(
    private _orderRepo: IOrderRepository,
    private _staffRepo: IStaffRepository,
    private _tableRepo: ITableRepository,
    private _paymentRepo: IPaymentRepository,
    private _settingsRepo: ISettingsRepository,
    private _logger: ILogger,
  ) {}

  // ── Staff ──

  async getStaff(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Employee>>> {
    const staff = await this._staffRepo.findAll({
      limit: query.limit ?? 50,
      offset: query.offset,
      orderBy: query.sortBy ?? 'last_name',
      orderDir: query.sortDirection ?? 'ASC',
    });
    return Result.ok(this._toPage(staff, query));
  }

  async getActiveShifts(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Shift>>> {
    const shifts = await this._staffRepo.getActiveShifts();
    return Result.ok(this._toPage(shifts, query));
  }

  async getShiftHistory(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Shift>>> {
    let shifts: Shift[];
    if (query.employeeId) {
      shifts = await this._staffRepo.getShifts(query.employeeId, {
        limit: query.limit ?? 50,
        offset: query.offset,
      });
    } else if (query.startDate && query.endDate) {
      shifts = await this._staffRepo.getShiftsByDateRange(query.startDate, query.endDate);
    } else {
      shifts = [];
    }
    return Result.ok(this._toPage(shifts, query));
  }

  // ── Tables ──

  async getTables(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Table>>> {
    const tables = await this._tableRepo.findAll({
      limit: query.limit ?? 100,
      offset: query.offset,
      orderBy: query.sortBy ?? 'name',
      orderDir: query.sortDirection ?? 'ASC',
    });
    return Result.ok(this._toPage(tables, query));
  }

  async getTableLayout(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Table>>> {
    const tables = await this._tableRepo.findAll({ orderBy: 'name' });
    return Result.ok(this._toPage(tables, query));
  }

  // ── Payments ──

  async getPayments(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<PaymentRecord>>> {
    let payments: PaymentRecord[];
    if (query.orderId) {
      payments = await this._paymentRepo.findByOrder(query.orderId);
    } else if (query.startDate && query.endDate) {
      payments = await this._paymentRepo.findByDateRange(query.startDate, query.endDate, {
        limit: query.limit ?? 50,
        offset: query.offset,
      });
    } else {
      payments = await this._paymentRepo.findAll({
        limit: query.limit ?? 50,
        offset: query.offset,
        orderBy: 'created_at',
        orderDir: 'DESC',
      });
    }
    return Result.ok(this._toPage(payments, query));
  }

  async getPaymentSummary(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const startDate = query.startDate ?? '2000-01-01';
    const endDate = query.endDate ?? '2099-12-31';
    const totals = await this._paymentRepo.getTotalByMethod(startDate, endDate);
    const summary = Array.from(totals.entries()).map(([method, total]) => ({ method, totalCents: total }));
    return Result.ok(this._toPage(summary, query));
  }

  // ── Auth ──

  async getCurrentUser(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const user = ctx.currentUser;
    const items = user ? [user] : [];
    return Result.ok({ items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 });
  }

  // ── Sync ──

  async getSyncStatus(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    return Result.ok({ items: [{ status: 'offline', pendingCount: 0, lastSyncAt: null }], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  // ── Counter ──

  async getActiveCounter(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const counter = ctx.isCounterOpen ? { id: ctx.counterId, status: 'open' } : null;
    const items = counter ? [counter] : [];
    return Result.ok({ items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 });
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return { items: sliced, totalCount, offset, limit, hasNextPage: offset + limit < totalCount, hasPreviousPage: offset > 0, totalPages: Math.ceil(totalCount / limit), executionTimeMs: 0 };
  }
}
