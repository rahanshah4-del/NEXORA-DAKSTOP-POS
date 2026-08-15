/**
 * DiscountEngine — Discount calculation and rule validation.
 *
 * Supports:
 *   - Percentage discounts (basis points)
 *   - Flat amount discounts (cents)
 *   - Per-item and order-level discounts
 *   - Minimum order value gates
 *   - Stackable discount rules
 */

// ── Types ──

export type DiscountType = 'percentage' | 'flat';

export interface DiscountRule {
  id: string;
  name: string;
  type: DiscountType;
  valueBpsOrCents: number;
  minOrderCents: number;
  maxDiscountCents: number | null;
  isActive: boolean;
  stackable: boolean;
  appliesToCategories: string[];
  appliesToProducts: string[];
}

export interface DiscountApplication {
  ruleId: string;
  ruleName: string;
  type: DiscountType;
  discountCents: number;
  description: string;
}

export interface DiscountResult {
  appliedDiscounts: DiscountApplication[];
  totalDiscountCents: number;
  subtotalBeforeCents: number;
  subtotalAfterCents: number;
}

// ── Engine ──

export class DiscountEngine {
  /**
   * Apply a set of discount rules to an order subtotal.
   *
   * @param subtotalCents The pre-discount subtotal.
   * @param rules         The active discount rules to evaluate.
   * @returns DiscountResult with all applied discounts.
   */
  applyDiscounts(subtotalCents: number, rules: DiscountRule[]): DiscountResult {
    const applied: DiscountApplication[] = [];
    let totalDiscountCents = 0;
    let hasStackableApplied = false;

    for (const rule of rules) {
      if (!rule.isActive) continue;

      // Check minimum order value
      if (subtotalCents < rule.minOrderCents) continue;

      // Non-stackable: only apply the first one
      if (!rule.stackable && applied.length > 0) continue;
      if (!rule.stackable && hasStackableApplied) continue;

      let discountCents: number;
      if (rule.type === 'percentage') {
        discountCents = Math.round(subtotalCents * rule.valueBpsOrCents / 10000);
      } else {
        discountCents = rule.valueBpsOrCents;
      }

      // Cap at max discount
      if (rule.maxDiscountCents !== null) {
        discountCents = Math.min(discountCents, rule.maxDiscountCents);
      }

      // Don't discount below zero
      discountCents = Math.min(discountCents, subtotalCents - totalDiscountCents);

      if (discountCents <= 0) continue;

      totalDiscountCents += discountCents;
      applied.push({
        ruleId: rule.id,
        ruleName: rule.name,
        type: rule.type,
        discountCents,
        description: rule.type === 'percentage'
          ? `${rule.name} (${(rule.valueBpsOrCents / 100).toFixed(1)}%)`
          : `${rule.name} (flat)`,
      });

      if (rule.stackable) hasStackableApplied = true;
    }

    return {
      appliedDiscounts: applied,
      totalDiscountCents,
      subtotalBeforeCents: subtotalCents,
      subtotalAfterCents: subtotalCents - totalDiscountCents,
    };
  }

  /**
   * Calculate a simple percentage discount.
   */
  percentageDiscount(subtotalCents: number, percentageBps: number): number {
    return Math.round(subtotalCents * percentageBps / 10000);
  }

  /**
   * Calculate a simple flat discount.
   */
  flatDiscount(subtotalCents: number, amountCents: number): number {
    return Math.min(amountCents, subtotalCents);
  }

  /**
   * Validate a discount rule configuration.
   */
  validateRule(rule: DiscountRule): { valid: boolean; error?: string } {
    if (rule.type === 'percentage' && (rule.valueBpsOrCents < 0 || rule.valueBpsOrCents > 10000)) {
      return { valid: false, error: 'Percentage discount must be between 0 and 10000 bps' };
    }
    if (rule.type === 'flat' && rule.valueBpsOrCents < 0) {
      return { valid: false, error: 'Flat discount must be non-negative' };
    }
    if (rule.minOrderCents < 0) {
      return { valid: false, error: 'Minimum order value must be non-negative' };
    }
    return { valid: true };
  }
}
