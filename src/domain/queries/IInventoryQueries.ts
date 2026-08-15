/**
 * Inventory Query Interfaces.
 * CQRS queries for reading inventory data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';
import type { InventoryItem, InventoryTransaction } from '../../types/models';

export interface IGetInventoryQuery extends IQuery<InventoryItem> {
  inventoryItemId?: string;
}

export interface IGetLowStockQuery extends IQuery<InventoryItem> {
  // Items at or below reorder point
}

export interface IGetOutOfStockQuery extends IQuery<InventoryItem> {
  // Items with zero quantity
}

export interface ISearchInventoryQuery extends IQuery<InventoryItem> {
  query: string;
}

export interface IGetInventoryTransactionsQuery extends IQuery<InventoryTransaction> {
  inventoryItemId?: string;
  startDate?: string;
  endDate?: string;
}

export interface IGetInventoryValueQuery {
  // Returns total inventory value (cost × quantity)
}
