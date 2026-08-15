/**
 * SQLiteProductRepository — concrete SQLite implementation of IProductRepository.
 *
 * Every write operation is transactional and enqueues a sync_queue entry.
 */

import type Database from 'better-sqlite3';
import type { Product } from '../../types/models';
import type { IProductRepository } from '../IProductRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, buildSearchClause, combineWhereClauses, notDeletedClause, intToBool, boolToInt } from './utils';

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  price_cents: number;
  cost_cents: number;
  tax_rate_bps: number;
  image_url: string | null;
  is_active: number;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteProductRepository extends BaseSqliteRepository<Product> implements IProductRepository {
  protected tableName = 'products';
  protected entityType = 'product' as const;

  protected toModel(row: Record<string, unknown>): Product {
    const r = row as unknown as ProductRow;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      sku: r.sku,
      barcode: r.barcode,
      categoryId: r.category_id,
      categoryName: (row as Record<string, unknown>).category_name as string | null ?? null,
      priceCents: r.price_cents,
      costCents: r.cost_cents,
      taxRateBps: r.tax_rate_bps,
      imageUrl: r.image_url,
      isActive: intToBool(r.is_active),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<Product>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.name !== undefined) db.name = data.name;
    if (data.description !== undefined) db.description = data.description;
    if (data.sku !== undefined) db.sku = data.sku;
    if (data.barcode !== undefined) db.barcode = data.barcode;
    if (data.categoryId !== undefined) db.category_id = data.categoryId;
    if (data.priceCents !== undefined) db.price_cents = data.priceCents;
    if (data.costCents !== undefined) db.cost_cents = data.costCents;
    if (data.taxRateBps !== undefined) db.tax_rate_bps = data.taxRateBps;
    if (data.imageUrl !== undefined) db.image_url = data.imageUrl;
    if (data.isActive !== undefined) db.is_active = boolToInt(data.isActive);
    return db;
  }

  async search(query: string, opts?: QueryOptions): Promise<Product[]> {
    const searchClause = buildSearchClause(query, ['name', 'sku', 'barcode']);
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

  async findBySku(sku: string): Promise<Product | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE sku = ? AND ${notDeletedClause()}`,
      [sku],
    );
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE barcode = ? AND ${notDeletedClause()}`,
      [barcode],
    );
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE category_id = ? AND ${notDeletedClause()} ORDER BY name ASC`,
      [categoryId],
    );
  }

  async findActive(opts?: QueryOptions): Promise<Product[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(opts, 'name ASC');

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      `WHERE is_active = 1 AND ${notDeletedClause()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, params);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive } as Partial<Product>);
  }

  async updatePrice(id: string, priceCents: number): Promise<void> {
    await this.update(id, { priceCents } as Partial<Product>);
  }

  async updateCost(id: string, costCents: number): Promise<void> {
    await this.update(id, { costCents } as Partial<Product>);
  }
}
