/**
 * OrderCalculator — Core order pricing and validation logic.
 *
 * Pure business logic. No repository or UI dependencies.
 * All amounts in integer cents to avoid floating-point errors.
 */

import type { OrderItem, Product } from '../../types/models';

// ── Types ──

export interface OrderCalculation {
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  itemCount: number;
  lineItems: LineItemCalculation[];
}

export interface LineItemCalculation {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  grossCents: number;
  discountCents: number;
  taxCents: number;
  netCents: number;
}

export interface ItemPricingInput {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
}

// ── Calculator ──

export class OrderCalculator {
  /**
   * Calculate the full order breakdown from raw line items.
   *
   * @param items       The line items with pricing.
   * @param taxRateBps  Tax rate in basis points (e.g., 850 = 8.5%).
   * @param discountBps Discount in basis points applied to subtotal.
   * @returns Complete OrderCalculation with subtotal/tax/discount/total.
   */
  calculate(
    items: ItemPricingInput[],
    taxRateBps: number = 0,
    discountBps: number = 0,
  ): OrderCalculation {
    const lineItems: LineItemCalculation[] = items.map((item) => {
      const grossCents = item.unitPriceCents * item.quantity;
      const itemDiscountCents = Math.round(grossCents * discountBps / 10000);
      const afterDiscount = grossCents - itemDiscountCents;
      const itemTaxCents = Math.round(afterDiscount * taxRateBps / 10000);
      const netCents = afterDiscount + itemTaxCents;

      return {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        grossCents,
        discountCents: itemDiscountCents,
        taxCents: itemTaxCents,
        netCents,
      };
    });

    const subtotalCents = lineItems.reduce((sum, li) => sum + li.grossCents, 0);
    const discountCents = lineItems.reduce((sum, li) => sum + li.discountCents, 0);
    const taxCents = lineItems.reduce((sum, li) => sum + li.taxCents, 0);
    const totalCents = lineItems.reduce((sum, li) => sum + li.netCents, 0);

    return {
      subtotalCents,
      taxCents,
      discountCents,
      totalCents,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      lineItems,
    };
  }

  /**
   * Calculate pricing for a single item given a product and quantity.
   */
  calculateItem(product: Product, quantity: number): LineItemCalculation {
    const grossCents = product.priceCents * quantity;
    const itemTaxCents = Math.round(grossCents * product.taxRateBps / 10000);
    const netCents = grossCents + itemTaxCents;

    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      grossCents,
      discountCents: 0,
      taxCents: itemTaxCents,
      netCents,
    };
  }

  /**
   * Recalculate totals after adding an item to an existing order.
   */
  recalculateAdd(
    currentSubtotalCents: number,
    currentTaxCents: number,
    newItem: LineItemCalculation,
  ): { subtotalCents: number; taxCents: number; totalCents: number } {
    const subtotalCents = currentSubtotalCents + newItem.grossCents;
    const taxCents = currentTaxCents + newItem.taxCents;
    const totalCents = subtotalCents + taxCents;
    return { subtotalCents, taxCents, totalCents };
  }

  /**
   * Recalculate totals after removing an item from an existing order.
   */
  recalculateRemove(
    currentSubtotalCents: number,
    currentTaxCents: number,
    removedItem: LineItemCalculation,
  ): { subtotalCents: number; taxCents: number; totalCents: number } {
    const subtotalCents = Math.max(0, currentSubtotalCents - removedItem.grossCents);
    const taxCents = Math.max(0, currentTaxCents - removedItem.taxCents);
    const totalCents = subtotalCents + taxCents;
    return { subtotalCents, taxCents, totalCents };
  }

  /**
   * Validate that an order has at least one item.
   */
  validateNotEmpty(items: ItemPricingInput[]): { valid: boolean; error?: string } {
    if (items.length === 0) {
      return { valid: false, error: 'Order must have at least one item' };
    }
    return { valid: true };
  }

  /**
   * Validate that no item has a negative or zero quantity.
   */
  validateQuantities(items: ItemPricingInput[]): { valid: boolean; error?: string } {
    for (const item of items) {
      if (item.quantity <= 0) {
        return { valid: false, error: `Item '${item.name}' must have a positive quantity` };
      }
    }
    return { valid: true };
  }
}
