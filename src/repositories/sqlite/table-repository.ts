/**
 * SQLiteTableRepository — concrete SQLite implementation of ITableRepository.
 *
 * Every write operation is transactional and enqueues a sync_queue entry.
 */

import type Database from 'better-sqlite3';
import type { Table } from '../../types/models';
import type { TableStatus } from '../../types/enums';
import type { ITableRepository } from '../ITableRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, notDeletedClause } from './utils';
import { enqueueSyncEntry } from './sync-queue';

interface TableRow {
  id: string;
  name: string;
  section: string | null;
  capacity: number;
  status: string;
  position_x: number | null;
  position_y: number | null;
  current_order_id: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteTableRepository extends BaseSqliteRepository<Table> implements ITableRepository {
  protected tableName = 'tables';
  protected entityType = 'table' as const;

  protected toModel(row: Record<string, unknown>): Table {
    const r = row as unknown as TableRow;
    return {
      id: r.id,
      name: r.name,
      section: r.section,
      capacity: r.capacity,
      status: r.status as TableStatus,
      positionX: r.position_x,
      positionY: r.position_y,
      currentOrderId: r.current_order_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<Table>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.name !== undefined) db.name = data.name;
    if (data.section !== undefined) db.section = data.section;
    if (data.capacity !== undefined) db.capacity = data.capacity;
    if (data.status !== undefined) db.status = data.status;
    if (data.positionX !== undefined) db.position_x = data.positionX;
    if (data.positionY !== undefined) db.position_y = data.positionY;
    if (data.currentOrderId !== undefined) db.current_order_id = data.currentOrderId;
    return db;
  }

  async findBySection(section: string): Promise<Table[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE section = ? AND ${notDeletedClause()} ORDER BY name ASC`,
      [section],
    );
  }

  async findByStatus(status: TableStatus): Promise<Table[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE status = ? AND ${notDeletedClause()} ORDER BY name ASC`,
      [status],
    );
  }

  async findAvailable(): Promise<Table[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE status = 'available' AND ${notDeletedClause()} ORDER BY name ASC`,
      [],
    );
  }

  async findByOrder(orderId: string): Promise<Table | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE current_order_id = ? AND ${notDeletedClause()}`,
      [orderId],
    );
  }

  async updateStatus(id: string, status: TableStatus): Promise<void> {
    await this.update(id, { status } as Partial<Table>);
  }

  async assignOrder(tableId: string, orderId: string): Promise<void> {
    await this.update(tableId, { currentOrderId: orderId } as Partial<Table>);
  }

  async clearOrder(tableId: string): Promise<void> {
    await this.update(tableId, { currentOrderId: null } as Partial<Table>);
  }

  async updatePosition(id: string, positionX: number, positionY: number): Promise<void> {
    await this.update(id, { positionX, positionY } as Partial<Table>);
  }
}
