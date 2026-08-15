/**
 * KitchenQueryHandlers.ts — Query handlers for Kitchen (KDS) queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IKitchenRepository, KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';
import type { ILogger } from '../common/IApplicationService';

export class KitchenQueryHandlers {
  constructor(
    private _kitchenRepo: IKitchenRepository,
    private _logger: ILogger,
  ) {}

  async getKitchenQueue(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<KitchenTicket>>> {
    const tickets = await this._kitchenRepo.findActiveTickets({
      limit: query.limit ?? 50,
      offset: query.offset,
      orderBy: query.sortBy ?? 'created_at',
      orderDir: query.sortDirection ?? 'DESC',
    });
    return Result.ok(this._toPage(tickets, query));
  }

  async getKitchenTicket(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<KitchenTicket>>> {
    const ticket = await this._kitchenRepo.findTicketByOrder(query.ticketId);
    return Result.ok(this._single(ticket, query));
  }

  async getActiveTickets(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<KitchenTicket>>> {
    const tickets = await this._kitchenRepo.findActiveTickets({
      limit: query.limit ?? 50,
      offset: query.offset,
    });
    return Result.ok(this._toPage(tickets, query));
  }

  async getTicketItems(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<KitchenTicketItem>>> {
    const items = await this._kitchenRepo.getTicketItems(query.ticketId);
    return Result.ok(this._toPage(items, query));
  }

  async getCompletedTickets(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<KitchenTicket>>> {
    const all = await this._kitchenRepo.findActiveTickets({ limit: 500 });
    const completed = all.filter((t) => t.status === 'completed');
    return Result.ok(this._toPage(completed, query));
  }

  async getKdsConfig(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    const configs = await this._kitchenRepo.getDisplayConfigs();
    return Result.ok(this._toPage(configs, query));
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
