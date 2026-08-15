/**
 * ProductService — Restaurant product/menu management logic.
 *
 * Orchestrates: ProductRepository
 * Uses engines: ModifierEngine
 *
 * Implements domain IProductService contract.
 */

import type { Product } from '../../../types/models';
import type { IProductRepository } from '../../../repositories/IProductRepository';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string, validationErrors: string[] = []): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors };
}

// ── Types ──

export interface CreateProductInput {
  name: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  priceCents: number;
  costCents: number;
  taxRateBps?: number;
  imageUrl?: string | null;
}

export interface UpdateProductInput {
  productId: string;
  name?: string;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  priceCents?: number;
  costCents?: number;
  taxRateBps?: number;
  imageUrl?: string | null;
}

export interface BulkPriceUpdateInput {
  productIds: string[];
  priceAdjustmentPercent: number;
  reason?: string;
}

// ── Service ──

export class ProductService {
  constructor(private productRepo: IProductRepository) {}

  // ── CRUD ──

  async createProduct(input: CreateProductInput): Promise<ServiceResult<Product>> {
    // Validate
    const errors: string[] = [];
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Product name is required');
    }
    if (input.priceCents < 0) {
      errors.push('Price must be non-negative');
    }
    if (input.costCents < 0) {
      errors.push('Cost must be non-negative');
    }

    // Check SKU uniqueness
    if (input.sku) {
      const existing = await this.productRepo.findBySku(input.sku);
      if (existing) {
        errors.push(`Product with SKU '${input.sku}' already exists`);
      }
    }

    if (errors.length > 0) return fail('Validation failed', errors);

    const product = await this.productRepo.create({
      name: input.name.trim(),
      description: input.description ?? null,
      sku: input.sku ?? null,
      barcode: input.barcode ?? null,
      categoryId: input.categoryId ?? null,
      priceCents: input.priceCents,
      costCents: input.costCents,
      taxRateBps: input.taxRateBps ?? 0,
      imageUrl: input.imageUrl ?? null,
      isActive: true,
    } as Partial<Product>);

    return ok(product);
  }

  async updateProduct(input: UpdateProductInput): Promise<ServiceResult<Product>> {
    const existing = await this.productRepo.findById(input.productId);
    if (!existing) return fail(`Product not found: ${input.productId}`);

    const updates: Partial<Product> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.sku !== undefined) updates.sku = input.sku;
    if (input.barcode !== undefined) updates.barcode = input.barcode;
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
    if (input.priceCents !== undefined) updates.priceCents = input.priceCents;
    if (input.costCents !== undefined) updates.costCents = input.costCents;
    if (input.taxRateBps !== undefined) updates.taxRateBps = input.taxRateBps;
    if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl;

    // SKU uniqueness check
    if (input.sku && input.sku !== existing.sku) {
      const duplicate = await this.productRepo.findBySku(input.sku);
      if (duplicate) return fail(`Product with SKU '${input.sku}' already exists`);
    }

    const product = await this.productRepo.update(input.productId, updates);
    return ok(product);
  }

  async deleteProduct(productId: string): Promise<ServiceResult<void>> {
    const existing = await this.productRepo.findById(productId);
    if (!existing) return fail(`Product not found: ${productId}`);
    await this.productRepo.delete(productId);
    return ok(undefined);
  }

  // ── Price Management ──

  async updatePrice(productId: string, priceCents: number): Promise<ServiceResult<Product>> {
    if (priceCents < 0) return fail('Price must be non-negative');
    await this.productRepo.updatePrice(productId, priceCents);
    const updated = await this.productRepo.findById(productId);
    return ok(updated!);
  }

  async updateCost(productId: string, costCents: number): Promise<ServiceResult<Product>> {
    if (costCents < 0) return fail('Cost must be non-negative');
    await this.productRepo.updateCost(productId, costCents);
    const updated = await this.productRepo.findById(productId);
    return ok(updated!);
  }

  async bulkUpdatePrices(input: BulkPriceUpdateInput): Promise<ServiceResult<Product[]>> {
    if (input.productIds.length === 0) {
      return fail('No products specified');
    }

    const updated: Product[] = [];
    for (const productId of input.productIds) {
      const product = await this.productRepo.findById(productId);
      if (!product) continue;

      const adj = input.priceAdjustmentPercent;
      const newPrice = Math.round(product.priceCents * (1 + adj / 100));
      await this.productRepo.updatePrice(productId, Math.max(0, newPrice));

      const refreshed = await this.productRepo.findById(productId);
      if (refreshed) updated.push(refreshed);
    }

    return ok(updated);
  }

  // ── Activation ──

  async activateProduct(productId: string): Promise<ServiceResult<void>> {
    await this.productRepo.setActive(productId, true);
    return ok(undefined);
  }

  async deactivateProduct(productId: string): Promise<ServiceResult<void>> {
    await this.productRepo.setActive(productId, false);
    return ok(undefined);
  }

  // ── Queries ──

  async getActiveProducts(): Promise<Product[]> {
    return this.productRepo.findActive();
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.productRepo.search(query);
  }

  async getByCategory(categoryId: string): Promise<Product[]> {
    return this.productRepo.findByCategory(categoryId);
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.productRepo.findBySku(sku);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.productRepo.findByBarcode(barcode);
  }
}
