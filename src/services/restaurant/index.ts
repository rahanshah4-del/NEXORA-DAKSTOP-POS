/**
 * Restaurant Service Layer — barrel export.
 *
 * Complete service layer for the Nexora Restaurant POS.
 *
 * Services (10):
 *   OrderService, PaymentService, ProductService, CustomerService,
 *   TableService, KitchenService, StaffService, SettingsService,
 *   ReportService, NotificationService
 *
 * Engines (8):
 *   OrderCalculator, DiscountEngine, TaxCalculator, TipCalculator,
 *   ModifierEngine, LoyaltyCalculator, KitchenWorkflow, TableAllocation
 *
 * Architecture:
 *   UI → Application Layer → Restaurant Services → Repository Layer → SQLite
 *
 * This module is additive — no existing files were modified.
 */

// ── Services ──
export { OrderService } from './order-service';
export type { ServiceResult, CreateOrderInput, UpdateOrderInput, CreateOrderItemInput } from './order-service';

export { PaymentService } from './payment-service';
export type { ProcessPaymentInput, RefundPaymentInput, PaymentSummary } from './payment-service';

export { ProductService } from './product-service';
export type { CreateProductInput, UpdateProductInput, BulkPriceUpdateInput } from './product-service';

export { CustomerService } from './customer-service';
export type { CreateCustomerInput, UpdateCustomerInput, CustomerWithLoyalty } from './customer-service';

export { TableService } from './table-service';
export type { CreateTableInput, UpdateTableInput } from './table-service';

export { KitchenService } from './kitchen-service';
export type { KitchenDashboard } from './kitchen-service';

export { StaffService } from './staff-service';
export type { CreateEmployeeInput, UpdateEmployeeInput, StaffSummary } from './staff-service';

export { SettingsService, SETTING_KEYS } from './settings-service';

export { ReportService } from './report-service';
export type {
  SalesReport,
  RevenueSummary,
  TopProduct,
  PaymentBreakdown,
  StaffPerformance,
  DailySummary,
  DashboardStats,
} from './report-service';

export { NotificationService } from './notification-service';
export type {
  Notification,
  NotificationType,
  NotificationCategory,
  NotificationListener,
  NotificationPreferences,
} from './notification-service';

// ── Engines ──
export * from './engines';
