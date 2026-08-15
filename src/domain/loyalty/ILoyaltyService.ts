/**
 * Loyalty Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IEnrollLoyaltyCommand, IRedeemLoyaltyCommand, IAdjustLoyaltyPointsCommand } from '../commands/IMiscCommands';
import type { ILoyaltyEnrolledEvent, ILoyaltyPointsRedeemedEvent } from '../events/IDomainEvents';

export interface LoyaltyAccount {
  id: string;
  customerId: string;
  programId: string;
  pointsBalance: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  tier: LoyaltyTier;
  enrolledAt: string;
  updatedAt: string;
}

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  type: 'earn' | 'redeem' | 'adjust' | 'expire';
  points: number;
  referenceId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ILoyaltyService {
  enroll(command: IEnrollLoyaltyCommand): Promise<LoyaltyAccount>;
  redeem(command: IRedeemLoyaltyCommand): Promise<LoyaltyAccount>;
  adjustPoints(command: IAdjustLoyaltyPointsCommand): Promise<LoyaltyAccount>;
  getAccount(customerId: string): Promise<LoyaltyAccount | null>;
  getHistory(customerId: string): Promise<LoyaltyTransaction[]>;
  calculateEarnedPoints(orderTotalCents: number, tier: LoyaltyTier): number;
  calculateRedemptionValue(points: number): number;
  updateTier(customerId: string): Promise<LoyaltyTier>;
}

export interface ILoyaltyValidator {
  validateEnroll(command: IEnrollLoyaltyCommand): import('../shared/IValidationResult').IValidationResult;
  validateRedeem(command: IRedeemLoyaltyCommand, account: LoyaltyAccount): import('../shared/IValidationResult').IValidationResult;
  validateAdjustment(command: IAdjustLoyaltyPointsCommand): import('../shared/IValidationResult').IValidationResult;
}

export interface ILoyaltyPolicy {
  pointsPerDollar(tier: LoyaltyTier): number;
  pointsValueCents(): number;
  minimumRedemptionPoints(): number;
  maximumRedemptionPoints(): number;
  pointsExpiryDays(): number;
  tierThresholds(): Record<LoyaltyTier, number>;
}

export interface ILoyaltyFactory {
  createAccount(customerId: string, programId: string): LoyaltyAccount;
  createTransaction(accountId: string, type: string, points: number, referenceId: string | null, reason: string | null): LoyaltyTransaction;
}

export interface ILoyaltyEventPublisher {
  enrolled(event: Omit<ILoyaltyEnrolledEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  pointsRedeemed(event: Omit<ILoyaltyPointsRedeemedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
