/**
 * Product Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { Product } from '../../types/models';
import type { ICreateProductCommand, IUpdateProductCommand, IBulkUpdatePriceCommand } from '../commands/IProductCommands';
import type { IProductCreatedEvent, IProductPriceChangedEvent, IProductDeactivatedEvent } from '../events/IDomainEvents';

export interface IProductService extends IDomainService<Product, ICreateProductCommand, IUpdateProductCommand> {
  findBySku(sku: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  findByCategory(categoryId: string): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
  updatePrice(productId: string, priceCents: number): Promise<Product>;
  updateCost(productId: string, costCents: number): Promise<Product>;
  activate(productId: string): Promise<Product>;
  deactivate(productId: string): Promise<Product>;
  bulkUpdatePrices(command: IBulkUpdatePriceCommand): Promise<Product[]>;
}

export interface IProductValidator extends IDomainValidator<ICreateProductCommand, Product> {
  validateSku(sku: string | null, existingProductId?: string): import('../shared/IValidationResult').IValidationResult;
  validateBarcode(barcode: string | null): import('../shared/IValidationResult').IValidationResult;
  validatePrice(priceCents: number, costCents: number): import('../shared/IValidationResult').IValidationResult;
}

export interface IProductPolicy extends IDomainPolicy<Product> {
  canDeactivate(product: Product): boolean;
  canChangePrice(product: Product): boolean;
  isPriceBelowCost(product: Product): boolean;
  getMaxPriceChangePercent(): number;
  getMinProfitMarginBps(): number;
}

export interface IProductFactory extends IDomainFactory<Product, ICreateProductCommand> {
  createVariant(base: Product, overrides: Partial<ICreateProductCommand>): Product;
}

export interface IProductEventPublisher {
  productCreated(event: Omit<IProductCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  productPriceChanged(event: Omit<IProductPriceChangedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  productDeactivated(event: Omit<IProductDeactivatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
