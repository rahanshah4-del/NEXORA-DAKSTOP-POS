/**
 * Enterprise Domain Layer — root barrel export.
 *
 * Architecture:
 *   UI → Domain Services → Repositories → SQLite → Sync → Cloud
 *
 * All interfaces only. No implementation.
 */

// ── Shared Base Layer ──
export type { IDomainService } from './shared/IDomainService';
export type { IDomainValidator } from './shared/IDomainValidator';
export type { IDomainPolicy, PolicySeverity } from './shared/IDomainPolicy';
export type { IDomainFactory, IFactoryContext } from './shared/IDomainFactory';
export type { ICommand, ICommandMetadata, ICommandResult } from './shared/ICommand';
export type { IQuery, IQueryResult } from './shared/IQuery';
export type { IDomainEventPayload, IDomainEventHandler } from './shared/IDomainEvent';
export type {
  IValidationResult,
  IValidationError,
  IValidationWarning,
  IValidationRule,
  ValidationRules,
} from './shared/IValidationResult';
export { ValidationResult } from './shared/IValidationResult';

// ── Commands ──
export type * from './commands';

// ── Queries ──
export type * from './queries';

// ── Domain Events ──
export type * from './events';

// ── Domain Services ──
export type { IOrderService, IOrderValidator, IOrderPolicy, IOrderFactory, IOrderEventPublisher } from './orders/IOrderService';
export type { ICustomerService, ICustomerValidator, ICustomerPolicy, ICustomerFactory, ICustomerEventPublisher } from './customers/ICustomerService';
export type { IProductService, IProductValidator, IProductPolicy, IProductFactory, IProductEventPublisher } from './products/IProductService';
export type { IInventoryService, IInventoryValidator, IInventoryPolicy, IInventoryFactory, IInventoryEventPublisher } from './inventory/IInventoryService';
export type { IPaymentService, IPaymentValidator, IPaymentPolicy, IPaymentFactory, IPaymentEventPublisher } from './payments/IPaymentService';
export type { ITableService, ITableValidator, ITablePolicy, ITableFactory, ITableEventPublisher } from './tables/ITableService';
export type { IKitchenService, IKitchenValidator, IKitchenPolicy, IKitchenFactory, IKitchenEventPublisher } from './kitchen/IKitchenService';
export type { IStaffService, IStaffValidator, IStaffPolicy, IStaffFactory, IStaffEventPublisher } from './staff/IStaffService';
export type { ISettingsService, ISettingsValidator, ISettingsPolicy, ISettingsFactory, ISettingsEventPublisher } from './settings/ISettingsService';
export type { IReportService, IReportValidator, IReportPolicy } from './reports/IReportService';
export type { IReservationService, IReservationValidator, IReservationPolicy, IReservationFactory, IReservationEventPublisher } from './reservations/IReservationService';
export type { ILoyaltyService, ILoyaltyValidator, ILoyaltyPolicy, ILoyaltyFactory, ILoyaltyEventPublisher } from './loyalty/ILoyaltyService';
export type { IDeliveryService, IDeliveryValidator, IDeliveryPolicy, IDeliveryFactory, IDeliveryEventPublisher } from './delivery/IDeliveryService';
export type { IPrinterService, IPrinterValidator, IPrinterPolicy } from './printers/IPrinterService';
export type { IBackupDomainService, IBackupValidator, IBackupPolicy, IBackupEventPublisher } from './backup/IBackupService';
export type { ISyncDomainService, ISyncValidator, ISyncPolicy, ISyncEventPublisher } from './sync/ISyncDomainService';
export type { IAuthService, IAuthValidator, IAuthPolicy, IAuthFactory, IAuthEventPublisher } from './auth/IAuthService';
export type { IWorkspaceService, IWorkspaceValidator, IWorkspacePolicy, IWorkspaceFactory, IWorkspaceEventPublisher } from './workspace/IWorkspaceService';
export type { IBranchService, IBranchValidator, IBranchPolicy, IBranchFactory, IBranchEventPublisher } from './branch/IBranchService';
export type { ICounterService, ICounterValidator, ICounterPolicy, ICounterFactory, ICounterEventPublisher } from './counter/ICounterService';

// ── Domain Model Types ──
export type { Reservation } from './reservations/IReservationService';
export type { LoyaltyAccount, LoyaltyTransaction, LoyaltyTier } from './loyalty/ILoyaltyService';
export type { Delivery, DeliveryStatus } from './delivery/IDeliveryService';
export type { Printer, PrintJob, PrinterType, PaperSize } from './printers/IPrinterService';
export type { CashCounter, CounterTransaction } from './counter/ICounterService';
export type { AuthSession } from './auth/IAuthService';
export type { Workspace } from './workspace/IWorkspaceService';
export type {
  ISalesReport,
  IRevenueSummary,
  ITopProduct,
  IPaymentBreakdown,
  IEmployeePerformance,
  ITableTurnover,
  IDailySummary,
} from './reports/IReportService';
