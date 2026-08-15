/**
 * TipCalculator — Tip/surcharge calculation logic.
 *
 * Supports:
 *   - Percentage-based tips
 *   - Flat-amount tips
 *   - Suggested tip percentages
 *   - Pre-tax and post-tax tip calculation
 *   - Service charge / auto-gratuity for large parties
 */

// ── Types ──

export interface TipOption {
  label: string;
  percentageBps: number;
  tipCents: number;
}

export interface TipCalculation {
  subtotalCents: number;
  tipPercentageBps: number | null;
  tipCents: number;
  totalWithTipCents: number;
  isAutoGratuity: boolean;
  autoGratuityReason: string | null;
}

export interface AutoGratuityRule {
  minPartySize: number;
  percentageBps: number;
  label: string;
}

// ── Engine ──

export class TipCalculator {
  private readonly defaultTipPercentages: number[] = [1500, 1800, 2000, 2500]; // 15%, 18%, 20%, 25%

  /**
   * Generate suggested tip options for a given subtotal.
   *
   * @param subtotalCents The order subtotal in cents.
   * @returns Array of tip options the customer can choose from.
   */
  getSuggestedTips(subtotalCents: number, percentages?: number[]): TipOption[] {
    const percents = percentages ?? this.defaultTipPercentages;

    return percents.map((bps) => ({
      label: `${(bps / 100).toFixed(0)}%`,
      percentageBps: bps,
      tipCents: Math.round(subtotalCents * bps / 10000),
    }));
  }

  /**
   * Calculate a percentage-based tip.
   */
  calculatePercentageTip(subtotalCents: number, percentageBps: number): number {
    if (percentageBps < 0) return 0;
    return Math.round(subtotalCents * percentageBps / 10000);
  }

  /**
   * Calculate a flat-amount tip.
   */
  calculateFlatTip(amountCents: number): number {
    return Math.max(0, amountCents);
  }

  /**
   * Calculate the full tip with optional auto-gratuity.
   *
   * @param subtotalCents  Order subtotal.
   * @param tipPercentageBps User-selected tip percentage (or null).
   * @param tipFlatCents    User-entered flat tip (or 0).
   * @param partySize       Number of guests.
   * @param autoGratuityRules Rules for automatic gratuity.
   */
  calculate(
    subtotalCents: number,
    tipPercentageBps: number | null,
    tipFlatCents: number = 0,
    partySize: number = 1,
    autoGratuityRules: AutoGratuityRule[] = [],
  ): TipCalculation {
    // Check auto-gratuity
    let autoGratuityBps = 0;
    let autoGratuityReason: string | null = null;

    const matchedRule = autoGratuityRules
      .filter((r) => partySize >= r.minPartySize)
      .sort((a, b) => b.minPartySize - a.minPartySize)[0];

    if (matchedRule) {
      autoGratuityBps = matchedRule.percentageBps;
      autoGratuityReason = `${matchedRule.label} (party of ${partySize})`;
    }

    // Use the higher of user tip or auto-gratuity
    const effectiveBps = Math.max(tipPercentageBps ?? 0, autoGratuityBps);
    const tipCents = effectiveBps > 0
      ? this.calculatePercentageTip(subtotalCents, effectiveBps)
      : tipFlatCents;

    const isAutoGratuity = autoGratuityBps > (tipPercentageBps ?? 0);

    return {
      subtotalCents,
      tipPercentageBps: effectiveBps > 0 ? effectiveBps : null,
      tipCents,
      totalWithTipCents: subtotalCents + tipCents,
      isAutoGratuity,
      autoGratuityReason,
    };
  }

  /**
   * Calculate a service charge (separate from tip).
   */
  calculateServiceCharge(subtotalCents: number, percentageBps: number): number {
    return Math.round(subtotalCents * percentageBps / 10000);
  }

  /**
   * Get standard auto-gratuity rules.
   */
  getDefaultAutoGratuityRules(): AutoGratuityRule[] {
    return [
      { minPartySize: 8, percentageBps: 1800, label: 'Auto-gratuity 18%' },
      { minPartySize: 6, percentageBps: 1500, label: 'Auto-gratuity 15%' },
    ];
  }
}
