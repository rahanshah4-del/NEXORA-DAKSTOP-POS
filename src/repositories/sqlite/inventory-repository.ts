/**
 * SQLiteInventoryRepository — concrete SQLite implementation of IInventoryRepository.
 *
 * Manages inventory_items and inventory_transactions tables.
 * adjustStock() runs in a transaction: update quantity + insert transaction + sync entries.
 */

import type Database from 'better-sqlite3';
import type { InventoryItem, InventoryTransaction } from '../../types/models';
import type { InventoryTransactionType } from '../../types/enums';
import type { IInventoryRepository } from '../IInventoryRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, buildSearchClause, combineWhereClauses, notDeletedClause, generateId } from './utils';
import { enqueueSyncEntry, enqueueSyncBatch } from './sync-queue';

interface InventoryItemRow {
  id: string;
  product_id: string | null;
  name: string;
  unit: string;
  quantity_on_hand: number;
  reorder_point: number;
  reorder_quantity: number;
  supplier_id: string | null;
  last_restock_at: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface InventoryTransactionRow {
  id: string;
  inventory_item_id: string;
  type: string;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  version: number;
  deleted_at: string | null;
  created_at: string;
}

export class SQLiteInventoryRepository
  extends BaseSqliteRepository<InventoryItem>
  implements IInventoryRepository
{
  protected tableName = 'inventory_items';
  protected entityType = 'inventory' as const;

  protected toModel(row: Record<string, unknown>): InventoryItem {
    const r = row as unknown as InventoryItemRow;
    return {
      id: r.id,
      productId: r.product_id,
      productName: (row as Record<string, unknown>).product_name as string | null ?? null,
      name: r.name,
      unit: r.unit,
      quantityOnHand: r.quantity_on_hand,
      reorderPoint: r.reorder_point,
      reorderQuantity: r.reorder_quantity,
      supplierId: r.supplier_id,
      lastRestockAt: r.last_restock_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<InventoryItem>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.productId !== undefined) db.product_id = data.productId;
    if (data.name !== undefined) db.name = data.name;
    if (data.unit !== undefined) db.unit = data.unit;
    if (data.quantityOnHand !== undefined) db.quantity_on_hand = data.quantityOnHand;
    if (data.reorderPoint !== undefined) db.reorder_point = data.reorderPoint;
    if (data.reorderQuantity !== undefined) db.reorder_quantity = data.reorderQuantity;
    if (data.supplierId !== undefined) db.supplier_id = data.supplierId;
    if (data.lastRestockAt !== undefined) db.last_restock_at = data.lastRestockAt;
    return db;
  }

  // ── Domain-Specific Queries ──

  async search(query: string, opts?: QueryOptions): Promise<InventoryItem[]> {
    const searchClause = buildSearchClause(query, ['name']);
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

  async findByProduct(productId: string): Promise<InventoryItem | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE product_id = ? AND ${notDeletedClause()}`,
      [productId],
    );
  }

  async findLowStock(): Promise<InventoryItem[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName}
       WHERE quantity_on_hand <= reorder_point AND ${notDeletedClause()}
       ORDER BY quantity_on_hand ASC`,
      [],
    );
  }

  async findOutOfStock(): Promise<InventoryItem[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName}
       WHERE quantity_on_hand <= 0 AND ${notDeletedClause()}
       ORDER BY name ASC`,
      [],
    );
  }

  async updateQuantity(id: string, quantityOnHand: number): Promise<void> {
    await this.update(id, { quantityOnHand } as Partial<InventoryItem>);
  }

  /**
   * adjustStock runs in a single transaction:
   * 1. Update the inventory item quantity
   * 2. Insert an inventory transaction record
   * 3. Enqueue sync entries for both
   */
  async adjustStock(
    itemId: string,
    quantity: number,
    type: InventoryTransactionType,
    notes?: string,
    referenceId?: string,
    createdBy?: string,
  ): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const transactionId = generateId();

    const runAdjust = this.db.transaction(() => {
      // 1. Get current item
      const item = this.db
        .prepare(`SELECT * FROM ${this.tableName} WHERE id = ? AND ${notDeletedClause()}`)
        .get(itemId) as Record<string, unknown> | undefined;

      if (!item) throw new Error(`Inventory item not found: ${itemId}`);

      // 2. Calculate new quantity based on transaction type
      let newQty = (item.quantity_on_hand as number) ?? 0;
      if (type === 'purchase' || type === 'adjustment') {
        newQty += quantity;
      } else if (type === 'consumption' || type === 'waste' || type === 'transfer') {
        newQty -= quantity;
      }

      const lastRestockAt = type === 'purchase' ? now : (item.last_restock_at as string | null);

      // 3. Update inventory item
      this.db
        .prepare(
          `UPDATE ${this.tableName}
           SET quantity_on_hand = ?,
               last_restock_at = ?,
               version = version + 1,
               updated_at = ?
           WHERE id = ?`,
        )
        .run(newQty, lastRestockAt, now, itemId);

      // 4. Insert transaction record
      this.db
        .prepare(
          `INSERT INTO inventory_transactions
           (id, inventory_item_id, type, quantity, reference_id, notes, created_by, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        )
        .run(transactionId, itemId, type, quantity, referenceId ?? null, notes ?? null, createdBy ?? 'system', now);

      // 5. Enqueue sync entries for both the item update and the transaction
      const updatedItem = this.db
        .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
        .get(itemId) as Record<string, unknown>;

      const transaction = this.db
        .prepare('SELECT * FROM inventory_transactions WHERE id = ?')
        .get(transactionId) as Record<string, unknown>;

      enqueueSyncBatch(this.db, [
        {
          entityType: 'inventory',
          entityId: itemId,
          operation: 'update',
          payload: updatedItem,
        },
        {
          entityType: 'inventory',
          entityId: transactionId,
          operation: 'create',
          payload: transaction,
        },
      ]);
    });

    runAdjust();
  }

  // ── Inventory Transactions ──

  async addTransaction(
    transaction: Partial<InventoryTransaction>,
  ): Promise<InventoryTransaction> {
    const id = transaction.id ?? generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runAdd = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO inventory_transactions
           (id, inventory_item_id, type, quantity, reference_id, notes, created_by, version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        )
        .run(
          id,
          transaction.inventoryItemId ?? '',
          transaction.type ?? 'adjustment',
          transaction.quantity ?? 0,
          transaction.referenceId ?? null,
          transaction.notes ?? null,
          transaction.createdBy ?? 'system',
          now,
        );

      const row = this.db
        .prepare('SELECT * FROM inventory_transactions WHERE id = ?')
        .get(id) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'inventory', id, 'create', row);
      }

      return row;
    });

    const row = runAdd();
    return this.transactionToModel(row as Record<string, unknown>);
  }

  async getTransactions(itemId: string, opts?: QueryOptions): Promise<InventoryTransaction[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(
      opts,
      'created_at DESC',
    );

    const sql = [
      `SELECT * FROM inventory_transactions`,
      `WHERE inventory_item_id = ? AND ${notDeletedClause()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    const rows = this.db
      .prepare(sql)
      .all(itemId, ...params) as Record<string, unknown>[];

    return rows.map((row) => this.transactionToModel(row));
  }

  async getTransactionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<InventoryTransaction[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM inventory_transactions
         WHERE created_at >= ? AND created_at <= ? AND ${notDeletedClause()}
         ORDER BY created_at DESC`,
      )
      .all(startDate, endDate) as Record<string, unknown>[];

    return rows.map((row) => this.transactionToModel(row));
  }

  // ── Transaction Row Mapping ──

  private transactionToModel(row: Record<string, unknown>): InventoryTransaction {
    const r = row as unknown as InventoryTransactionRow;
    return {
      id: r.id,
      inventoryItemId: r.inventory_item_id,
      itemName: (row as Record<string, unknown>).item_name as string | null ?? null,
      type: r.type as InventoryTransactionType,
      quantity: r.quantity,
      referenceId: r.reference_id,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
    };
  }
}
