/**
 * InventoryQueryHandlers.ts — Query handlers for Inventory queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { ILogger } from '../common/IApplicationService';
import type { InventoryItem, InventoryTransaction } from '../../types/models';

export class InventoryQueryHandlers {
  constructor(
    private _inventoryRepo: IInventoryRepository,
    private _logger: ILogger,
  ) {}

  async getInventory(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<InventoryItem>>> {
    let items: InventoryItem[];
    if (query.inventoryItemId) {
      const item = await this._inventoryRepo.findById(query.inventoryItemId);
      items = item ? [item] : [];
    } else {
      items = await this._inventoryRepo.findAll({
        limit: query.limit ?? 100,
        offset: query.offset,
        orderBy: query.sortBy ?? 'name',
        orderDir: query.sortDirection,
      });
    }
    return Result.ok(this._toPage(items, query));
  }

  async getLowStock(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<InventoryItem>>> {
    const items = await this._inventoryRepo.findLowStock();
    return Result.ok(this._toPage(items, query));
  }

  async getOutOfStock(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<InventoryItem>>> {
    const items = await this._inventoryRepo.findOutOfStock();
    return Result.ok(this._toPage(items, query));
  }

  async searchInventory(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<InventoryItem>>> {
    const items = await this._inventoryRepo.search(query.query, {
      limit: query.limit ?? 50,
      offset: query.offset,
    });
    return Result.ok(this._toPage(items, query));
  }

  async getInventoryTransactions(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<InventoryTransaction>>> {
    let transactions: InventoryTransaction[];
    if (query.inventoryItemId) {
      transactions = await this._inventoryRepo.getTransactions(query.inventoryItemId, {
        limit: query.limit ?? 100,
        offset: query.offset,
      });
    } else if (query.startDate && query.endDate) {
      transactions = await this._inventoryRepo.getTransactionsByDateRange(query.startDate, query.endDate);
    } else {
      transactions = [];
    }
    return Result.ok(this._toPage(transactions, query));
  }

  async getInventoryValue(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const items = await this._inventoryRepo.findAll();
    const value = { totalItems: items.length, totalQuantity: items.reduce((s, i) => s + i.quantityOnHand, 0) };
    return Result.ok({ items: [value], totalCount: 1, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: 1, executionTimeMs: 0 });
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return { items: sliced, totalCount, offset, limit, hasNextPage: offset + limit < totalCount, hasPreviousPage: offset > 0, totalPages: Math.ceil(totalCount / limit), executionTimeMs: 0 };
  }
}
