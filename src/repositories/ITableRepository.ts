/**
 * ITableRepository — repository interface for Tables.
 * Interface only. No implementation.
 */

import type { Table } from '../types/models';
import type { TableStatus } from '../types/enums';
import type { ISyncRepository } from './IRepository';

// ── Table Repository Interface ──

export interface ITableRepository extends ISyncRepository<Table> {
  /** Find tables by section */
  findBySection(section: string): Promise<Table[]>;

  /** Find tables by status */
  findByStatus(status: TableStatus): Promise<Table[]>;

  /** Find available tables */
  findAvailable(): Promise<Table[]>;

  /** Find the table linked to a specific order */
  findByOrder(orderId: string): Promise<Table | null>;

  /** Update table status */
  updateStatus(id: string, status: TableStatus): Promise<void>;

  /** Assign an order to a table */
  assignOrder(tableId: string, orderId: string): Promise<void>;

  /** Clear the order assignment from a table */
  clearOrder(tableId: string): Promise<void>;

  /** Update table position on the floor plan */
  updatePosition(id: string, positionX: number, positionY: number): Promise<void>;
}
