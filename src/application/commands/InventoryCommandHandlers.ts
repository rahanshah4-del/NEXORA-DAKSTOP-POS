/**
 * InventoryCommandHandlers.ts — Command handlers for Inventory-related commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { InventoryItem, InventoryTransaction } from '../../types/models';
import type { InventoryTransactionType } from '../../types/enums';

export class InventoryCommandHandlers {
  constructor(
    private _inventoryRepo: IInventoryRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async createInventoryItem(command: any, ctx: IApplicationContext): Promise<Result<InventoryItem>> {
    if (command.productId) {
      const existing = await this._inventoryRepo.findByProduct(command.productId);
      if (existing) return Result.conflict('Inventory item already exists for this product');
    }

    const item = await this._inventoryRepo.create({
      productId: command.productId ?? null,
      name: command.name,
      unit: command.unit ?? 'pcs',
      quantityOnHand: command.quantityOnHand ?? 0,
      reorderPoint: command.reorderPoint ?? 0,
      reorderQuantity: command.reorderQuantity ?? 0,
      supplierId: command.supplierId ?? null,
    } as Partial<InventoryItem>);

    this._logger.info(`Inventory item created: ${item.name}`, { itemId: item.id });
    return Result.ok(item);
  }

  async updateInventoryItem(command: any, ctx: IApplicationContext): Promise<Result<InventoryItem>> {
    const existing = await this._inventoryRepo.findById(command.inventoryItemId);
    if (!existing) return Result.notFound('InventoryItem', command.inventoryItemId);

    const updates: Partial<InventoryItem> = {};
    if (command.name !== undefined) updates.name = command.name;
    if (command.unit !== undefined) updates.unit = command.unit;
    if (command.reorderPoint !== undefined) updates.reorderPoint = command.reorderPoint;
    if (command.reorderQuantity !== undefined) updates.reorderQuantity = command.reorderQuantity;
    if (command.supplierId !== undefined) updates.supplierId = command.supplierId;

    const item = await this._inventoryRepo.update(command.inventoryItemId, updates);
    return Result.ok(item);
  }

  async adjustInventory(command: any, ctx: IApplicationContext): Promise<Result<InventoryItem>> {
    const existing = await this._inventoryRepo.findById(command.inventoryItemId);
    if (!existing) return Result.notFound('InventoryItem', command.inventoryItemId);

    // Prevent negative stock for non-purchase adjustments
    if (command.type !== 'purchase' && command.type !== 'adjustment') {
      if (existing.quantityOnHand < command.quantity) {
        return Result.businessRuleViolation(
          `Insufficient stock: have ${existing.quantityOnHand}, need ${command.quantity}`,
        );
      }
    }

    await this._inventoryRepo.adjustStock(
      command.inventoryItemId,
      command.quantity,
      command.type as InventoryTransactionType,
      command.notes,
      command.referenceId,
      ctx.currentUser?.id ?? 'system',
    );

    const updated = await this._inventoryRepo.findById(command.inventoryItemId);
    this._events.publish('inventory.adjusted', {
      itemId: command.inventoryItemId,
      type: command.type,
      quantity: command.quantity,
    });

    if (updated && updated.quantityOnHand <= updated.reorderPoint) {
      this._events.publish('inventory.lowStock', {
        itemId: command.inventoryItemId,
        quantityOnHand: updated.quantityOnHand,
      });
    }

    return Result.ok(updated!);
  }

  async bulkAdjustInventory(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    for (const adj of command.adjustments ?? []) {
      await this.adjustInventory(adj, ctx);
    }
    return Result.success();
  }

  async recordWaste(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._inventoryRepo.adjustStock(
      command.inventoryItemId,
      command.quantity,
      'waste',
      command.reason ?? 'Waste recorded',
      undefined,
      ctx.currentUser?.id ?? 'system',
    );
    this._events.publish('inventory.waste', { itemId: command.inventoryItemId, quantity: command.quantity });
    return Result.success();
  }

  async reorder(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._inventoryRepo.adjustStock(
      command.inventoryItemId,
      command.quantity,
      'purchase',
      `Reorder from supplier: ${command.supplierId ?? 'unknown'}`,
      undefined,
      ctx.currentUser?.id ?? 'system',
    );
    return Result.success();
  }
}
