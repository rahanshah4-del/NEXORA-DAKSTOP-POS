/**
 * Inventory Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { InventoryItem } from '../../types/models';
import type { ICreateInventoryItemCommand, IUpdateInventoryItemCommand, IAdjustInventoryCommand, IReorderCommand } from '../commands/IInventoryCommands';
import type { IInventoryAdjustedEvent, ILowStockAlertEvent, IStockDepletedEvent } from '../events/IDomainEvents';

export interface IInventoryService extends IDomainService<InventoryItem, ICreateInventoryItemCommand, IUpdateInventoryItemCommand> {
  adjust(command: IAdjustInventoryCommand): Promise<InventoryItem>;
  getLowStock(): Promise<InventoryItem[]>;
  getOutOfStock(): Promise<InventoryItem[]>;
  findByProduct(productId: string): Promise<InventoryItem | null>;
  search(query: string): Promise<InventoryItem[]>;
  reorder(command: IReorderCommand): Promise<void>;
  recordWaste(itemId: string, quantity: number, reason: string): Promise<InventoryItem>;
}

export interface IInventoryValidator extends IDomainValidator<ICreateInventoryItemCommand, InventoryItem> {
  validateAdjustment(command: IAdjustInventoryCommand, existing: InventoryItem): import('../shared/IValidationResult').IValidationResult;
  validateWaste(itemId: string, quantity: number, existing: InventoryItem): import('../shared/IValidationResult').IValidationResult;
}

export interface IInventoryPolicy extends IDomainPolicy<InventoryItem> {
  isLowStock(item: InventoryItem): boolean;
  isOutOfStock(item: InventoryItem): boolean;
  needsReorder(item: InventoryItem): boolean;
  canGoNegative(item: InventoryItem): boolean;
  getMinimumReorderQuantity(item: InventoryItem): number;
}

export interface IInventoryFactory extends IDomainFactory<InventoryItem, ICreateInventoryItemCommand> {
  createFromProduct(productId: string, productName: string): InventoryItem;
}

export interface IInventoryEventPublisher {
  inventoryAdjusted(event: Omit<IInventoryAdjustedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  lowStockAlert(event: Omit<ILowStockAlertEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  stockDepleted(event: Omit<IStockDepletedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
