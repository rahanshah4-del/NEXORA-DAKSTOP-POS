/**
 * SQLiteOrderRepository — concrete SQLite implementation of IOrderRepository.
 *
 * Manages orders and order_items tables.
 * Every write is transactional and enqueues a sync_queue entry.
 */

import type Database from 'better-sqlite3';
import type { Order, OrderItem } from '../../types/models';
import type { OrderStatus, PaymentStatus, OrderType } from '../../types/enums';
import type { IOrderRepository } from '../IOrderRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, buildSearchClause, combineWhereClauses, generateId, notDeletedClause } from './utils';
import { enqueueSyncEntry } from './sync-queue';

// ── Row type for joined queries ──
interface OrderRow {
  // orders table
  id: string;
  order_number: number;
  table_id: string | null;
  customer_id: string | null;
  order_type: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  payment_status: string;
  payment_method: string | null;
  notes: string | null;
  cancel_reason: string | null;
  created_by: string;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  table_name: string | null;
  customer_name: string | null;
}

// ── Repository ──

export class SQLiteOrderRepository extends BaseSqliteRepository<Order> implements IOrderRepository {
  protected tableName = 'orders';
  protected entityType = 'order' as const;

  // ── Row Mapping ──

  protected toModel(row: Record<string, unknown>): Order {
    const r = row as unknown as OrderRow;
    return {
      id: r.id,
      orderNumber: r.order_number,
      tableId: r.table_id,
      tableName: (r as Record<string, unknown>).table_name as string | null ?? null,
      customerId: r.customer_id,
      customerName: (r as Record<string, unknown>).customer_name as string | null ?? null,
      orderType: r.order_type as OrderType,
      status: r.status as OrderStatus,
      subtotalCents: r.subtotal_cents,
      taxCents: r.tax_cents,
      discountCents: r.discount_cents,
      totalCents: r.total_cents,
      paymentStatus: r.payment_status as PaymentStatus,
      paymentMethod: (r.payment_method ?? null) as PaymentMethod | null,
      notes: r.notes,
      cancelReason: r.cancel_reason ?? null,
      items: [],
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<Order>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.orderNumber !== undefined) db.order_number = data.orderNumber;
    if (data.tableId !== undefined) db.table_id = data.tableId;
    if (data.customerId !== undefined) db.customer_id = data.customerId;
    if (data.orderType !== undefined) db.order_type = data.orderType;
    if (data.status !== undefined) db.status = data.status;
    if (data.subtotalCents !== undefined) db.subtotal_cents = data.subtotalCents;
    if (data.taxCents !== undefined) db.tax_cents = data.taxCents;
    if (data.discountCents !== undefined) db.discount_cents = data.discountCents;
    if (data.totalCents !== undefined) db.total_cents = data.totalCents;
    if (data.paymentStatus !== undefined) db.payment_status = data.paymentStatus;
    if (data.paymentMethod !== undefined) db.payment_method = data.paymentMethod;
    if (data.notes !== undefined) db.notes = data.notes;
    if (data.cancelReason !== undefined) db.cancel_reason = data.cancelReason;
    if (data.createdBy !== undefined) db.created_by = data.createdBy;
    return db;
  }

  // ── Helpers ──

  /** Build a SELECT with JOINs for denormalised table_name and customer_name. */
  private orderSelect(): string {
    return `
      SELECT o.*, t.name AS table_name, c.name AS customer_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN customers c ON o.customer_id = c.id
    `;
  }

  private orderWhere(): string {
    return `o.${notDeletedClause()}`;
  }

  // ── IRepository Overrides (use JOIN query) ──

  async findAll(opts?: QueryOptions): Promise<Order[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(
      opts,
      'o.created_at DESC',
    );

    const sql = [
      this.orderSelect(),
      `WHERE ${this.orderWhere()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, params);
  }

  async findById(id: string): Promise<Order | null> {
    const sql = `${this.orderSelect()} WHERE o.id = ? AND ${this.orderWhere()}`;
    return this.getOne(sql, [id]);
  }

  // ── Domain-Specific Queries ──

  async findByTable(tableId: string): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.table_id = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [tableId]);
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.customer_id = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [customerId]);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.status = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [status]);
  }

  async findByType(orderType: OrderType): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.order_type = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [orderType]);
  }

  async findByPaymentStatus(paymentStatus: PaymentStatus): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.payment_status = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [paymentStatus]);
  }

  async findByCreatedBy(userId: string): Promise<Order[]> {
    const sql = `${this.orderSelect()} WHERE o.created_by = ? AND ${this.orderWhere()} ORDER BY o.created_at DESC`;
    return this.getMany(sql, [userId]);
  }

  async findByDateRange(startDate: string, endDate: string, opts?: QueryOptions): Promise<Order[]> {
    const { orderClause, limitClause, offsetClause, params: optsParams } = buildQueryOptions(
      opts,
      'o.created_at DESC',
    );

    const sql = [
      this.orderSelect(),
      `WHERE o.created_at >= ? AND o.created_at <= ? AND ${this.orderWhere()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, [startDate, endDate, ...optsParams]);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.update(id, { status } as Partial<Order>);
  }

  async cancelOrder(id: string, reason: string): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const nowIso = new Date().toISOString();
    const runCancel = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
        )
        .run(reason, now, id);

      // Enqueue a PosOrder-camelCase sync payload for cancellation so
      // sync-drain's replayOrder can resolve workspaceId + orderNumber
      // correctly.  We do NOT spread the raw SQLite row (snake_case) —
      // that would cause replayOrder to write to a phantom document at
      // workspaces/default/orders/unknown.
      const orderRow = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      if (orderRow) {
        // Resolve a plausible workspaceId from the order's own data if present,
        // otherwise default — the caller should pass it when available.
        const wsId = (orderRow.workspace_id as string) || (orderRow.workspaceId as string) || 'default';
        enqueueSyncEntry(this.db, 'order', id, 'update', {
          orderNumber: id,
          workspaceId: wsId,
          orderStatus: 'cancelled',
          cancelReason: reason,
          updatedAt: nowIso,
          _cancelSyncNote: 'Partial update — replayOrder must merge (not overwrite) this payload.',
        }, wsId, 'main');
      }
    });
    runCancel();
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<void> {
    await this.update(id, { paymentStatus } as Partial<Order>);
  }

  async findWithItems(id: string): Promise<Order | null> {
    const order = await this.findById(id);
    if (!order) return null;

    const items = await this.getItems(id);
    order.items = items;
    return order;
  }

  async getNextOrderNumber(): Promise<number> {
    const row = this.db
      .prepare('SELECT MAX(order_number) AS max_num FROM orders')
      .get() as { max_num: number | null } | undefined;
    return (row?.max_num ?? 0) + 1;
  }

  // ── Order Items ──

  async addItem(orderId: string, item: Partial<OrderItem>): Promise<OrderItem> {
    const id = item.id ?? generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runAdd = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO order_items (id, order_id, product_id, name, quantity, unit_price_cents, total_price_cents, notes, status, version, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        )
        .run(
          id,
          orderId,
          item.productId ?? '',
          item.name ?? '',
          item.quantity ?? 1,
          item.unitPriceCents ?? 0,
          item.totalPriceCents ?? 0,
          item.notes ?? null,
          item.status ?? 'pending',
          now,
          now,
        );

      const row = this.db
        .prepare('SELECT * FROM order_items WHERE id = ?')
        .get(id) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'order', orderId, 'update', this.prepareSyncPayload(orderId));
      }

      return row;
    });

    const row = runAdd();
    return this.itemToModel(row as Record<string, unknown>);
  }

  async updateItem(itemId: string, data: Partial<OrderItem>): Promise<OrderItem> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const setClauses: string[] = ['updated_at = ?', 'version = version + 1'];
    const values: unknown[] = [now];

    if (data.productId !== undefined) { setClauses.push('product_id = ?'); values.push(data.productId); }
    if (data.name !== undefined) { setClauses.push('name = ?'); values.push(data.name); }
    if (data.quantity !== undefined) { setClauses.push('quantity = ?'); values.push(data.quantity); }
    if (data.unitPriceCents !== undefined) { setClauses.push('unit_price_cents = ?'); values.push(data.unitPriceCents); }
    if (data.totalPriceCents !== undefined) { setClauses.push('total_price_cents = ?'); values.push(data.totalPriceCents); }
    if (data.notes !== undefined) { setClauses.push('notes = ?'); values.push(data.notes); }
    if (data.status !== undefined) { setClauses.push('status = ?'); values.push(data.status); }

    values.push(itemId);

    const runUpdate = this.db.transaction(() => {
      this.db
        .prepare(`UPDATE order_items SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`)
        .run(...values);

      const row = this.db.prepare('SELECT * FROM order_items WHERE id = ?').get(itemId) as Record<string, unknown>;
      const orderId = row?.order_id as string;

      if (orderId) {
        enqueueSyncEntry(this.db, 'order', orderId, 'update', this.prepareSyncPayload(orderId));
      }

      return row;
    });

    const row = runUpdate();
    if (!row) throw new Error(`Order item not found: ${itemId}`);
    return this.itemToModel(row as Record<string, unknown>);
  }

  async removeItem(itemId: string): Promise<void> {
    const runRemove = this.db.transaction(() => {
      const itemRow = this.db
        .prepare('SELECT * FROM order_items WHERE id = ? AND deleted_at IS NULL')
        .get(itemId) as Record<string, unknown> | undefined;

      if (!itemRow) throw new Error(`Order item not found: ${itemId}`);

      const orderId = itemRow.order_id as string;
      const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

      this.db
        .prepare('UPDATE order_items SET deleted_at = ?, updated_at = ? WHERE id = ?')
        .run(now, now, itemId);

      enqueueSyncEntry(this.db, 'order', orderId, 'update', this.prepareSyncPayload(orderId));
    });

    runRemove();
  }

  async getItems(orderId: string): Promise<OrderItem[]> {
    const rows = this.db
      .prepare('SELECT * FROM order_items WHERE order_id = ? AND deleted_at IS NULL ORDER BY created_at ASC')
      .all(orderId) as Record<string, unknown>[];

    return rows.map((row) => this.itemToModel(row));
  }

  // ── Item Row Mapping ──

  private itemToModel(row: Record<string, unknown>): OrderItem {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      productId: row.product_id as string,
      name: row.name as string,
      quantity: row.quantity as number,
      unitPriceCents: row.unit_price_cents as number,
      totalPriceCents: row.total_price_cents as number,
      notes: (row.notes as string) ?? null,
      status: row.status as OrderStatus,
      createdAt: row.created_at as string,
    };
  }

  // ── Sync Payload Helpers ──

  /** Build the full sync payload for an order (including its items). */
  private prepareSyncPayload(orderId: string): Record<string, unknown> {
    const order = this.db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(orderId) as Record<string, unknown> | undefined;

    const items = this.db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(orderId) as Record<string, unknown>[];

    return {
      ...(order ?? {}),
      items,
    };
  }
}
