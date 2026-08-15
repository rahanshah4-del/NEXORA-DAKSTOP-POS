/**
 * LoyaltyCalculator — Loyalty points calculation and redemption logic.
 *
 * Handles:
 *   - Points earned per dollar spent
 *   - Tier-based earning multipliers
 *   - Points redemption value
 *   - Minimum/maximum redemption thresholds
 */

// ── Types ──

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyEarning {
  basePoints: number;
  tierMultiplier: number;
  bonusPoints: number;
  totalPoints: number;
  tier: LoyaltyTier;
}

export interface LoyaltyRedemption {
  pointsRedeemed: number;
  valueCents: number;
  remainingPoints: number;
  isAllowed: boolean;
  rejectionReason: string | null;
}

export interface LoyaltyTierConfig {
  tier: LoyaltyTier;
  pointsPerDollar: number;
  minimumOrders: number;
  minimumSpentCents: number;
}

// ── Engine ──

export class LoyaltyCalculator {
  private readonly defaultTierConfigs: LoyaltyTierConfig[] = [
    { tier: 'bronze', pointsPerDollar: 1, minimumOrders: 0, minimumSpentCents: 0 },
    { tier: 'silver', pointsPerDollar: 1.5, minimumOrders: 10, minimumSpentCents: 50000 },
    { tier: 'gold', pointsPerDollar: 2, minimumOrders: 30, minimumSpentCents: 150000 },
    { tier: 'platinum', pointsPerDollar: 3, minimumOrders: 60, minimumSpentCents: 400000 },
  ];

  private readonly pointsValueCents = 1; // 1 point = 1 cent

  /**
   * Calculate loyalty points earned for an order.
   *
   * @param orderTotalCents Total order value in cents.
   * @param currentTier     The customer's current loyalty tier.
   * @param bonusMultiplier Optional campaign/promotion multiplier.
   */
  calculateEarnings(
    orderTotalCents: number,
    currentTier: LoyaltyTier = 'bronze',
    bonusMultiplier: number = 1,
  ): LoyaltyEarning {
    const config = this.getTierConfig(currentTier);
    const pointsPerDollar = config?.pointsPerDollar ?? 1;
    const dollars = orderTotalCents / 100;

    const basePoints = Math.floor(dollars * pointsPerDollar);
    const tierMultiplier = pointsPerDollar;
    const bonusPoints = Math.floor(basePoints * (bonusMultiplier - 1));
    const totalPoints = basePoints + bonusPoints;

    return {
      basePoints,
      tierMultiplier,
      bonusPoints,
      totalPoints,
      tier: currentTier,
    };
  }

  /**
   * Calculate the redemption value for a given number of points.
   */
  calculateRedemption(
    pointsToRedeem: number,
    availablePoints: number,
    orderTotalCents: number,
  ): LoyaltyRedemption {
    const minimumRedemption = 100; // minimum 100 points
    const maxRedemptionPercent = 50; // max 50% of order total can be paid with points

    if (pointsToRedeem < minimumRedemption) {
      return {
        pointsRedeemed: 0,
        valueCents: 0,
        remainingPoints: availablePoints,
        isAllowed: false,
        rejectionReason: `Minimum redemption is ${minimumRedemption} points`,
      };
    }

    if (pointsToRedeem > availablePoints) {
      return {
        pointsRedeemed: 0,
        valueCents: 0,
        remainingPoints: availablePoints,
        isAllowed: false,
        rejectionReason: 'Insufficient points balance',
      };
    }

    const maxRedeemableValue = Math.round(orderTotalCents * maxRedemptionPercent / 100);
    const requestedValue = pointsToRedeem * this.pointsValueCents;
    const actualValue = Math.min(requestedValue, maxRedeemableValue);
    const actualPoints = Math.floor(actualValue / this.pointsValueCents);

    return {
      pointsRedeemed: actualPoints,
      valueCents: actualValue,
      remainingPoints: availablePoints - actualPoints,
      isAllowed: true,
      rejectionReason: null,
    };
  }

  /**
   * Determine a customer's loyalty tier based on their stats.
   */
  determineTier(totalOrders: number, totalSpentCents: number): LoyaltyTier {
    const eligible = this.defaultTierConfigs
      .filter((t) => totalOrders >= t.minimumOrders && totalSpentCents >= t.minimumSpentCents)
      .sort((a, b) => b.pointsPerDollar - a.pointsPerDollar);

    return eligible[0]?.tier ?? 'bronze';
  }

  /**
   * Get the configuration for a specific tier.
   */
  getTierConfig(tier: LoyaltyTier): LoyaltyTierConfig | undefined {
    return this.defaultTierConfigs.find((t) => t.tier === tier);
  }

  /**
   * Get all tier configurations.
   */
  getTierConfigs(): LoyaltyTierConfig[] {
    return [...this.defaultTierConfigs];
  }
}
