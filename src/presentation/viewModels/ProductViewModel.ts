/**
 * ProductViewModel.ts — Transforms Product domain models to UI-friendly shapes.
 */

import type { Product } from '../../types/models';

export interface ProductViewData {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  categoryName: string;
  price: string;
  cost: string;
  taxRate: string;
  margin: string;
  marginPercent: string;
  isActive: boolean;
  statusLabel: string;
  createdAtFormatted: string;
}

export class ProductViewModel {
  static centsToDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  static formatDate(iso: string): string {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  static toViewData(product: Product): ProductViewData {
    const marginCents = product.priceCents - product.costCents;
    const marginPercent = product.priceCents > 0
      ? ((marginCents / product.priceCents) * 100).toFixed(1)
      : '0.0';

    return {
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      sku: product.sku ?? '—',
      barcode: product.barcode ?? '—',
      categoryName: product.categoryName ?? 'Uncategorized',
      price: this.centsToDollars(product.priceCents),
      cost: this.centsToDollars(product.costCents),
      taxRate: `${(product.taxRateBps / 100).toFixed(1)}%`,
      margin: this.centsToDollars(marginCents),
      marginPercent: `${marginPercent}%`,
      isActive: product.isActive,
      statusLabel: product.isActive ? 'Active' : 'Inactive',
      createdAtFormatted: this.formatDate(product.createdAt),
    };
  }

  static toViewDataList(products: Product[]): ProductViewData[] {
    return products.map((p) => this.toViewData(p));
  }

  /** Format price for display with currency symbol. */
  static formatPrice(cents: number, symbol = '$'): string {
    return `${symbol}${(cents / 100).toFixed(2)}`;
  }
}
