/**
 * Product Command Interfaces.
 * CQRS commands for the Product aggregate.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';

export interface ICreateProductCommand extends ICommand {
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  priceCents: number;
  costCents: number;
  taxRateBps: number;
  imageUrl: string | null;
}

export interface IUpdateProductCommand extends ICommand {
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

export interface IUpdateProductPriceCommand extends ICommand {
  productId: string;
  priceCents: number;
}

export interface IUpdateProductCostCommand extends ICommand {
  productId: string;
  costCents: number;
}

export interface IActivateProductCommand extends ICommand {
  productId: string;
}

export interface IDeactivateProductCommand extends ICommand {
  productId: string;
}

export interface IBulkUpdatePriceCommand extends ICommand {
  productIds: string[];
  priceAdjustmentPercent: number;
  reason: string;
}
