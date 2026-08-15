/**
 * SQLiteKitchenRepository — concrete SQLite implementation of IKitchenRepository.
 *
 * Manages kitchen_tickets, kitchen_ticket_items, and kds_display_configs tables.
 * Does NOT extend IRepository (custom interface), but still supports soft-delete
 * and sync queueing per the global repository requirements.
 */

import type Database from 'better-sqlite3';
import type {
  IKitchenRepository,
  KitchenTicket,
  KitchenTicketItem,
  KdsDisplayConfig,
} from '../IKitchenRepository';
import type { QueryOptions } from '../../services/db-service';
import { buildQueryOptions, notDeletedClause, generateId, intToBool, boolToInt, parseJson } from './utils';
import { enqueueSyncEntry } from './sync-queue';

export class SQLiteKitchenRepository implements IKitchenRepository {
  constructor(private db: Database.Database) {}

  // ── Tickets ──

  async createTicket(orderId: string, priority = 'normal'): Promise<KitchenTicket> {
    const id = generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    // Look up order info for denormalised fields
    const order = this.db
      .prepare('SELECT o.order_number, t.name AS table_name FROM orders o LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = ?')
      .get(orderId) as { order_number: number; table_name: string | null } | undefined;

    const orderNumber = order?.order_number ?? 0;
    const tableName = order?.table_name ?? null;

    const runCreate = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO kitchen_tickets (id, order_id, order_number, table_name, status, priority, notes, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'pending', ?, NULL, 1, ?, ?)`,
        )
        .run(id, orderId, orderNumber, tableName, priority, now, now);

      const row = this.db
        .prepare('SELECT * FROM kitchen_tickets WHERE id = ?')
        .get(id) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'kitchen', id, 'create', row);
      }

      return row;
    });

    const row = runCreate();
    return this.ticketToModel(row as Record<string, unknown>);
  }

  async findTicketByOrder(orderId: string): Promise<KitchenTicket | null> {
    const row = this.db
      .prepare(`SELECT * FROM kitchen_tickets WHERE order_id = ? AND ${notDeletedClause()}`)
      .get(orderId) as Record<string, unknown> | undefined;

    return row ? this.ticketToModel(row) : null;
  }

  async findActiveTickets(opts?: QueryOptions): Promise<KitchenTicket[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(
      opts,
      'created_at DESC',
    );

    const sql = [
      `SELECT * FROM kitchen_tickets`,
      `WHERE status IN ('pending', 'preparing', 'ready') AND ${notDeletedClause()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.ticketToModel(row));
  }

  async updateTicketStatus(ticketId: string, status: KitchenTicket['status']): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runUpdate = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE kitchen_tickets SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND ${notDeletedClause()}`,
        )
        .run(status, now, ticketId);

      const row = this.db
        .prepare('SELECT * FROM kitchen_tickets WHERE id = ?')
        .get(ticketId) as Record<string, unknown> | undefined;

      if (row) {
        enqueueSyncEntry(this.db, 'kitchen', ticketId, 'update', row);
      }
    });

    runUpdate();
  }

  async completeTicket(ticketId: string): Promise<void> {
    await this.updateTicketStatus(ticketId, 'completed');
  }

  // ── Ticket Items ──

  async getTicketItems(ticketId: string): Promise<KitchenTicketItem[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM kitchen_ticket_items WHERE ticket_id = ? AND ${notDeletedClause()} ORDER BY created_at ASC`,
      )
      .all(ticketId) as Record<string, unknown>[];

    return rows.map((row) => this.ticketItemToModel(row));
  }

  async updateItemStatus(
    itemId: string,
    status: KitchenTicketItem['status'],
  ): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runUpdate = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE kitchen_ticket_items SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND ${notDeletedClause()}`,
        )
        .run(status, now, itemId);

      const row = this.db
        .prepare('SELECT * FROM kitchen_ticket_items WHERE id = ?')
        .get(itemId) as Record<string, unknown> | undefined;

      if (row) {
        enqueueSyncEntry(this.db, 'kitchen', itemId, 'update', row);
      }
    });

    runUpdate();
  }

  async markAllItemsReady(ticketId: string): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runUpdate = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE kitchen_ticket_items SET status = 'ready', version = version + 1, updated_at = ? WHERE ticket_id = ? AND ${notDeletedClause()}`,
        )
        .run(now, ticketId);

      // Enqueue sync for the ticket
      const ticket = this.db
        .prepare('SELECT * FROM kitchen_tickets WHERE id = ?')
        .get(ticketId) as Record<string, unknown> | undefined;

      if (ticket) {
        enqueueSyncEntry(this.db, 'kitchen', ticketId, 'update', ticket);
      }
    });

    runUpdate();
  }

  // ── Display Configs ──

  async getDisplayConfigs(): Promise<KdsDisplayConfig[]> {
    const rows = this.db
      .prepare(`SELECT * FROM kds_display_configs WHERE ${notDeletedClause()} ORDER BY name ASC`)
      .all() as Record<string, unknown>[];

    return rows.map((row) => this.displayConfigToModel(row));
  }

  async saveDisplayConfig(config: Partial<KdsDisplayConfig>): Promise<KdsDisplayConfig> {
    const id = config.id ?? generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const existing = this.db
      .prepare(`SELECT * FROM kds_display_configs WHERE id = ? AND ${notDeletedClause()}`)
      .get(id) as Record<string, unknown> | undefined;

    const runSave = this.db.transaction(() => {
      if (existing) {
        const setClauses: string[] = ['version = version + 1', 'updated_at = ?'];
        const values: unknown[] = [now];

        if (config.name !== undefined) { setClauses.push('name = ?'); values.push(config.name); }
        if (config.categoryIds !== undefined) { setClauses.push('category_ids = ?'); values.push(JSON.stringify(config.categoryIds)); }
        if (config.isActive !== undefined) { setClauses.push('is_active = ?'); values.push(boolToInt(config.isActive)); }

        values.push(id);

        this.db
          .prepare(`UPDATE kds_display_configs SET ${setClauses.join(', ')} WHERE id = ?`)
          .run(...values);
      } else {
        this.db
          .prepare(
            `INSERT INTO kds_display_configs (id, name, category_ids, is_active, version, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
          )
          .run(
            id,
            config.name ?? 'Untitled',
            JSON.stringify(config.categoryIds ?? []),
            boolToInt(config.isActive ?? true),
            now,
            now,
          );
      }

      const row = this.db
        .prepare('SELECT * FROM kds_display_configs WHERE id = ?')
        .get(id) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'kitchen', id, existing ? 'update' : 'create', row);
      }

      return row;
    });

    const row = runSave();
    return this.displayConfigToModel(row as Record<string, unknown>);
  }

  async deleteDisplayConfig(configId: string): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runDelete = this.db.transaction(() => {
      const row = this.db
        .prepare(`SELECT * FROM kds_display_configs WHERE id = ? AND ${notDeletedClause()}`)
        .get(configId) as Record<string, unknown> | undefined;

      if (!row) throw new Error(`KDS display config not found: ${configId}`);

      this.db
        .prepare('UPDATE kds_display_configs SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .run(now, now, configId);

      enqueueSyncEntry(this.db, 'kitchen', configId, 'delete', row);
    });

    runDelete();
  }

  // ── Row Mapping ──

  private ticketToModel(row: Record<string, unknown>): KitchenTicket {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      orderNumber: row.order_number as number,
      tableName: (row.table_name as string) ?? null,
      status: row.status as KitchenTicket['status'],
      priority: row.priority as KitchenTicket['priority'],
      notes: (row.notes as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private ticketItemToModel(row: Record<string, unknown>): KitchenTicketItem {
    return {
      id: row.id as string,
      ticketId: row.ticket_id as string,
      productId: row.product_id as string,
      productName: row.product_name as string,
      quantity: row.quantity as number,
      notes: (row.notes as string) ?? null,
      status: row.status as KitchenTicketItem['status'],
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private displayConfigToModel(row: Record<string, unknown>): KdsDisplayConfig {
    return {
      id: row.id as string,
      name: row.name as string,
      categoryIds: parseJson<string[]>(row.category_ids) ?? [],
      isActive: intToBool(row.is_active),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
