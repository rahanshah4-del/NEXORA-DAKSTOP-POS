/**
 * Inventory Command Interfaces.
 * CQRS commands for the Inventory aggregate.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';
import type { InventoryTransactionType } from '../../types/enums';

export interface ICreateInventoryItemCommand extends ICommand {
  productId: string | null;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplierId: string | null;
}

export interface IUpdateInventoryItemCommand extends ICommand {
  inventoryItemId: string;
  name?: string;
  unit?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  supplierId?: string | null;
}

export interface IAdjustInventoryCommand extends ICommand {
  inventoryItemId: string;
  type: InventoryTransactionType;
  quantity: number;
  notes: string | null;
  referenceId: string | null;
}

export interface IBulkAdjustInventoryCommand extends ICommand {
  adjustments: Array<{
    inventoryItemId: string;
    type: InventoryTransactionType;
    quantity: number;
    notes: string | null;
  }>;
}

export interface IRecordWasteCommand extends ICommand {
  inventoryItemId: string;
  quantity: number;
  reason: string;
}

export interface IReorderCommand extends ICommand {
  inventoryItemId: string;
  quantity: number;
  supplierId: string;
}
