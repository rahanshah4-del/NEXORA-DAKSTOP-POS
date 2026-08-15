/**
 * Restaurant Engines — barrel export.
 *
 * Pure business logic engines with zero dependencies.
 * Used by restaurant services for calculations and rule evaluation.
 */

export { OrderCalculator } from './order-calculator';
export type { OrderCalculation, LineItemCalculation, ItemPricingInput } from './order-calculator';

export { DiscountEngine } from './discount-engine';
export type { DiscountRule, DiscountApplication, DiscountResult, DiscountType } from './discount-engine';

export { TaxCalculator } from './tax-calculator';
export type { TaxRate, TaxCalculation, TaxResult } from './tax-calculator';

export { TipCalculator } from './tip-calculator';
export type { TipOption, TipCalculation, AutoGratuityRule } from './tip-calculator';

export { ModifierEngine } from './modifier-engine';
export type {
  ModifierGroup,
  Modifier,
  SelectedModifier,
  ModifierValidation,
} from './modifier-engine';

export { LoyaltyCalculator } from './loyalty-calculator';
export type {
  LoyaltyTier,
  LoyaltyEarning,
  LoyaltyRedemption,
  LoyaltyTierConfig,
} from './loyalty-calculator';

export { KitchenWorkflow } from './kitchen-workflow';
export type { TicketStatus, TicketPriority, ItemStatus, StatusTransition, WorkflowState } from './kitchen-workflow';

export { TableAllocation } from './table-allocation';
export type {
  TableInfo,
  AllocationRequest,
  AllocationResult,
  SectionAvailability,
} from './table-allocation';
