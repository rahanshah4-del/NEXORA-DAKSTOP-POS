/**
 * IProductRepository — repository interface for Products.
 * Interface only. No implementation.
 */

import type { Product } from '../types/models';
import type { ISyncRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Product Repository Interface ──

export interface IProductRepository extends ISyncRepository<Product> {
  /** Search products by name, SKU, or barcode */
  search(query: string, opts?: QueryOptions): Promise<Product[]>;

  /** Find product by SKU */
  findBySku(sku: string): Promise<Product | null>;

  /** Find product by barcode */
  findByBarcode(barcode: string): Promise<Product | null>;

  /** Find products by category */
  findByCategory(categoryId: string): Promise<Product[]>;

  /** Find active products only */
  findActive(opts?: QueryOptions): Promise<Product[]>;

  /** Toggle product active status */
  setActive(id: string, isActive: boolean): Promise<void>;

  /** Update product price */
  updatePrice(id: string, priceCents: number): Promise<void>;

  /** Update product cost */
  updateCost(id: string, costCents: number): Promise<void>;
}
