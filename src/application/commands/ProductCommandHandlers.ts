/**
 * ProductCommandHandlers.ts — Command handlers for Product-related commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { IProductRepository } from '../../repositories/IProductRepository';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { Product } from '../../types/models';

export class ProductCommandHandlers {
  constructor(
    private _productRepo: IProductRepository,
    private _inventoryRepo: IInventoryRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async createProduct(command: any, ctx: IApplicationContext): Promise<Result<Product>> {
    // Check SKU uniqueness
    if (command.sku) {
      const existing = await this._productRepo.findBySku(command.sku);
      if (existing) return Result.conflict(`Product with SKU '${command.sku}' already exists`);
    }

    const product = await this._productRepo.create({
      name: command.name,
      description: command.description ?? null,
      sku: command.sku ?? null,
      barcode: command.barcode ?? null,
      categoryId: command.categoryId ?? null,
      priceCents: command.priceCents ?? 0,
      costCents: command.costCents ?? 0,
      taxRateBps: command.taxRateBps ?? 0,
      imageUrl: command.imageUrl ?? null,
      isActive: true,
    } as Partial<Product>);

    this._events.publish('product.created', { productId: product.id, name: product.name });
    this._logger.info(`Product created: ${product.name}`, { productId: product.id });
    return Result.ok(product);
  }

  async updateProduct(command: any, ctx: IApplicationContext): Promise<Result<Product>> {
    const existing = await this._productRepo.findById(command.productId);
    if (!existing) return Result.notFound('Product', command.productId);

    const updates: Partial<Product> = {};
    if (command.name !== undefined) updates.name = command.name;
    if (command.description !== undefined) updates.description = command.description;
    if (command.sku !== undefined) updates.sku = command.sku;
    if (command.barcode !== undefined) updates.barcode = command.barcode;
    if (command.categoryId !== undefined) updates.categoryId = command.categoryId;
    if (command.priceCents !== undefined) updates.priceCents = command.priceCents;
    if (command.costCents !== undefined) updates.costCents = command.costCents;
    if (command.taxRateBps !== undefined) updates.taxRateBps = command.taxRateBps;
    if (command.imageUrl !== undefined) updates.imageUrl = command.imageUrl;

    const product = await this._productRepo.update(command.productId, updates);
    this._events.publish('product.updated', { productId: command.productId });
    return Result.ok(product);
  }

  async updateProductPrice(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const existing = await this._productRepo.findById(command.productId);
    if (!existing) return Result.notFound('Product', command.productId);

    await this._productRepo.updatePrice(command.productId, command.priceCents);
    this._events.publish('product.priceChanged', { productId: command.productId, priceCents: command.priceCents });
    return Result.success();
  }

  async updateProductCost(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._productRepo.updateCost(command.productId, command.costCents);
    return Result.success();
  }

  async activateProduct(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._productRepo.setActive(command.productId, true);
    return Result.success();
  }

  async deactivateProduct(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._productRepo.setActive(command.productId, false);
    this._events.publish('product.deactivated', { productId: command.productId });
    return Result.success();
  }

  async bulkUpdatePrice(command: any, ctx: IApplicationContext): Promise<Result<Product[]>> {
    const updated: Product[] = [];
    for (const productId of command.productIds ?? []) {
      const product = await this._productRepo.findById(productId);
      if (!product) continue;

      const adjustment = command.priceAdjustmentPercent ?? 0;
      const newPrice = Math.round(product.priceCents * (1 + adjustment / 100));
      await this._productRepo.updatePrice(productId, newPrice);
      updated.push(await this._productRepo.findById(productId) as Product);
    }

    this._logger.info(`Bulk price update: ${updated.length} products`, { reason: command.reason });
    return Result.ok(updated);
  }
}
