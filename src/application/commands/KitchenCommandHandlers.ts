/**
 * KitchenCommandHandlers.ts — Command handlers for Kitchen (KDS) commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { IKitchenRepository, KitchenTicket, KitchenTicketItem, KdsDisplayConfig } from '../../repositories/IKitchenRepository';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';

export class KitchenCommandHandlers {
  constructor(
    private _kitchenRepo: IKitchenRepository,
    private _orderRepo: IOrderRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async createKitchenTicket(command: any, ctx: IApplicationContext): Promise<Result<KitchenTicket>> {
    const order = await this._orderRepo.findById(command.orderId);
    if (!order) return Result.notFound('Order', command.orderId);

    const existing = await this._kitchenRepo.findTicketByOrder(command.orderId);
    if (existing) return Result.conflict('Kitchen ticket already exists for this order');

    const ticket = await this._kitchenRepo.createTicket(command.orderId, command.priority ?? 'normal');
    this._events.publish('kitchen.ticketCreated', { ticketId: ticket.id, orderId: command.orderId });
    return Result.ok(ticket);
  }

  async updateTicketItemStatus(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._kitchenRepo.updateItemStatus(command.itemId, command.status);
    if (command.status === 'ready') {
      this._events.publish('kitchen.itemReady', { itemId: command.itemId, ticketId: command.ticketId });
    }
    return Result.success();
  }

  async completeKitchenTicket(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._kitchenRepo.completeTicket(command.ticketId);
    this._events.publish('kitchen.ticketCompleted', { ticketId: command.ticketId });
    return Result.success();
  }

  async markItemReady(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._kitchenRepo.updateItemStatus(command.itemId, 'ready');
    this._events.publish('kitchen.itemReady', { itemId: command.itemId, ticketId: command.ticketId });
    return Result.success();
  }

  async bumpTicket(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._kitchenRepo.updateTicketStatus(command.ticketId, 'completed');
    return Result.success();
  }

  async assignKdsDisplay(command: any, ctx: IApplicationContext): Promise<Result<KdsDisplayConfig>> {
    const config = await this._kitchenRepo.saveDisplayConfig({
      name: command.displayId ?? 'KDS Display',
      categoryIds: command.categoryIds ?? [],
      isActive: true,
    });
    return Result.ok(config);
  }
}
