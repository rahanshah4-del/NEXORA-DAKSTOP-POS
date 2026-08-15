/**
 * IInventoryRepository — repository interface for Inventory.
 * Interface only. No implementation.
 */

import type { InventoryItem, InventoryTransaction } from '../types/models';
import type { InventoryTransactionType } from '../types/enums';
import type { ISyncRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Inventory Repository Interface ──

export interface IInventoryRepository extends ISyncRepository<InventoryItem> {
  /** Search inventory items by name */
  search(query: string, opts?: QueryOptions): Promise<InventoryItem[]>;

  /** Find inventory item by product ID */
  findByProduct(productId: string): Promise<InventoryItem | null>;

  /** Find items that are at or below reorder point */
  findLowStock(): Promise<InventoryItem[]>;

  /** Find items that are out of stock */
  findOutOfStock(): Promise<InventoryItem[]>;

  /** Update quantity on hand */
  updateQuantity(id: string, quantityOnHand: number): Promise<void>;

  /** Adjust stock quantity and record a transaction */
  adjustStock(
    itemId: string,
    quantity: number,
    type: InventoryTransactionType,
    notes?: string,
    referenceId?: string,
    createdBy?: string,
  ): Promise<void>;

  // ── Inventory Transactions ──

  /** Add an inventory transaction */
  addTransaction(transaction: Partial<InventoryTransaction>): Promise<InventoryTransaction>;

  /** Get transactions for an inventory item */
  getTransactions(itemId: string, opts?: QueryOptions): Promise<InventoryTransaction[]>;

  /** Get all transactions within a date range */
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<InventoryTransaction[]>;
}
