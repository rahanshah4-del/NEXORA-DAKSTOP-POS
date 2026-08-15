/**
 * TaxCalculator — Tax computation logic for orders and items.
 *
 * Supports:
 *   - Tax-inclusive and tax-exclusive pricing
 *   - Multiple tax rates per item
 *   - Order-level tax rounding
 *   - Tax-exempt items
 */

// ── Types ──

export interface TaxRate {
  name: string;
  rateBps: number;           // e.g., 850 = 8.5%
  appliesToCategories: string[];
  appliesToProducts: string[];
  isActive: boolean;
}

export interface TaxCalculation {
  taxName: string;
  rateBps: number;
  taxableCents: number;
  taxCents: number;
}

export interface TaxResult {
  calculations: TaxCalculation[];
  totalTaxCents: number;
  taxableSubtotalCents: number;
  taxExemptCents: number;
  isTaxInclusive: boolean;
}

// ── Engine ──

export class TaxCalculator {
  /**
   * Calculate tax on a subtotal with given tax rates.
   *
   * @param subtotalCents   The taxable amount in cents.
   * @param taxRates        Active tax rates to apply.
   * @param taxExemptCents  Amount exempt from tax.
   * @param isTaxInclusive  If true, tax is already included in prices.
   * @returns Full TaxResult breakdown.
   */
  calculate(
    subtotalCents: number,
    taxRates: TaxRate[],
    taxExemptCents: number = 0,
    isTaxInclusive: boolean = false,
  ): TaxResult {
    const taxableCents = Math.max(0, subtotalCents - taxExemptCents);
    const activeRates = taxRates.filter((r) => r.isActive);
    const calculations: TaxCalculation[] = [];

    if (isTaxInclusive) {
      // Tax-inclusive: extract tax from the gross amount
      // formula: tax = gross * rate / (10000 + rate)
      for (const rate of activeRates) {
        const taxCents = Math.round(taxableCents * rate.rateBps / (10000 + rate.rateBps));
        calculations.push({
          taxName: rate.name,
          rateBps: rate.rateBps,
          taxableCents,
          taxCents,
        });
      }
    } else {
      // Tax-exclusive: add tax on top
      for (const rate of activeRates) {
        const taxCents = Math.round(taxableCents * rate.rateBps / 10000);
        calculations.push({
          taxName: rate.name,
          rateBps: rate.rateBps,
          taxableCents,
          taxCents,
        });
      }
    }

    const totalTaxCents = calculations.reduce((sum, c) => sum + c.taxCents, 0);

    return {
      calculations,
      totalTaxCents,
      taxableSubtotalCents: taxableCents,
      taxExemptCents,
      isTaxInclusive,
    };
  }

  /**
   * Calculate tax for a single item.
   */
  calculateForItem(
    itemPriceCents: number,
    rateBps: number,
    quantity: number = 1,
  ): number {
    const gross = itemPriceCents * quantity;
    return Math.round(gross * rateBps / 10000);
  }

  /**
   * Determine if a product is tax-exempt based on its category.
   */
  isTaxExempt(
    categoryId: string,
    exemptCategoryIds: string[],
  ): boolean {
    return exemptCategoryIds.includes(categoryId);
  }

  /**
   * Round tax to nearest cent (already integers — included for clarity).
   */
  roundTax(taxCents: number): number {
    return Math.round(taxCents);
  }

  /**
   * Calculate the pre-tax amount from a tax-inclusive total.
   */
  extractPreTax(totalCents: number, rateBps: number): number {
    return Math.round(totalCents / (1 + rateBps / 10000));
  }
}
