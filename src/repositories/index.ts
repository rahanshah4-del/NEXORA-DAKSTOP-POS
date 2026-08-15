/**
 * Repositories Module — barrel export.
 * All repository interfaces for the POS data layer.
 */

// ── Base Repository ──
export type { IRepository, ISyncRepository } from './IRepository';

// ── Entity Repositories ──
export type { IOrderRepository } from './IOrderRepository';
export type { ICustomerRepository } from './ICustomerRepository';
export type { IProductRepository } from './IProductRepository';
export type { IInventoryRepository } from './IInventoryRepository';
export type { IPaymentRepository, PaymentRecord } from './IPaymentRepository';
export type { ITableRepository } from './ITableRepository';
export type {
  IKitchenRepository,
  KitchenTicket,
  KitchenTicketItem,
  KdsDisplayConfig,
} from './IKitchenRepository';
export type { IStaffRepository } from './IStaffRepository';
export type { ISettingsRepository } from './ISettingsRepository';
