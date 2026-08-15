/**
 * SQLiteCustomerRepository — concrete SQLite implementation of ICustomerRepository.
 *
 * Every write operation is transactional and enqueues a sync_queue entry.
 */

import type Database from 'better-sqlite3';
import type { Customer } from '../../types/models';
import type { ICustomerRepository } from '../ICustomerRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, buildSearchClause, combineWhereClauses, notDeletedClause } from './utils';
import { enqueueSyncEntry } from './sync-queue';

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  total_orders: number;
  total_spent_cents: number;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteCustomerRepository extends BaseSqliteRepository<Customer> implements ICustomerRepository {
  protected tableName = 'customers';
  protected entityType = 'customer' as const;

  protected toModel(row: Record<string, unknown>): Customer {
    const r = row as unknown as CustomerRow;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      notes: r.notes,
      totalOrders: r.total_orders,
      totalSpentCents: r.total_spent_cents,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<Customer>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.name !== undefined) db.name = data.name;
    if (data.email !== undefined) db.email = data.email;
    if (data.phone !== undefined) db.phone = data.phone;
    if (data.address !== undefined) db.address = data.address;
    if (data.notes !== undefined) db.notes = data.notes;
    if (data.totalOrders !== undefined) db.total_orders = data.totalOrders;
    if (data.totalSpentCents !== undefined) db.total_spent_cents = data.totalSpentCents;
    return db;
  }

  async search(query: string, opts?: QueryOptions): Promise<Customer[]> {
    const searchClause = buildSearchClause(query, ['name', 'email', 'phone']);
    const { orderClause, limitClause, offsetClause, params: optParams } = buildQueryOptions(opts, 'name ASC');

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      `WHERE ${combineWhereClauses({ sql: notDeletedClause(), params: [] }, searchClause).sql}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, [...searchClause.params, ...optParams]);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE email = ? AND ${notDeletedClause()}`,
      [email],
    );
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE phone = ? AND ${notDeletedClause()}`,
      [phone],
    );
  }

  async findTopBySpent(limit = 10): Promise<Customer[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE ${notDeletedClause()} ORDER BY total_spent_cents DESC LIMIT ?`,
      [limit],
    );
  }

  async findTopByOrders(limit = 10): Promise<Customer[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE ${notDeletedClause()} ORDER BY total_orders DESC LIMIT ?`,
      [limit],
    );
  }

  async updateStats(id: string, orderTotalCents: number): Promise<void> {
    const runUpdate = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE ${this.tableName}
           SET total_orders = total_orders + 1,
               total_spent_cents = total_spent_cents + ?,
               version = version + 1,
               updated_at = datetime('now')
           WHERE id = ? AND ${notDeletedClause()}`,
        )
        .run(orderTotalCents, id);

      // Enqueue sync
      const record = this.db
        .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .get(id) as Record<string, unknown> | undefined;

      if (record) {
        enqueueSyncEntry(this.db, this.entityType, id, 'update', record);
      }
    });

    runUpdate();
  }
}
