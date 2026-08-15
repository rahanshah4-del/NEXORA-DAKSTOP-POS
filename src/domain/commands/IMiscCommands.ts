/**
 * Miscellaneous Command Interfaces.
 * CQRS commands for Payment, Settings, Reservation,
 * Loyalty, Delivery, Printer, and Sync domains.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';
import type { PaymentMethod } from '../../types/enums';

// ── Payment Commands ──

export interface IProcessPaymentCommand extends ICommand {
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  reference: string | null;
}

export interface IRefundPaymentCommand extends ICommand {
  paymentId: string;
  amountCents: number;
  reason: string;
}

export interface IVoidPaymentCommand extends ICommand {
  paymentId: string;
  reason: string;
}

// ── Settings Commands ──

export interface IUpdateSettingCommand extends ICommand {
  key: string;
  value: string;
}

export interface IBulkUpdateSettingsCommand extends ICommand {
  settings: Record<string, string>;
}

export interface IResetSettingCommand extends ICommand {
  key: string;
}

// ── Reservation Commands ──

export interface ICreateReservationCommand extends ICommand {
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  tableId: string | null;
  notes: string | null;
}

export interface IUpdateReservationCommand extends ICommand {
  reservationId: string;
  partySize?: number;
  reservationTime?: string;
  tableId?: string | null;
  notes?: string | null;
}

export interface ICancelReservationCommand extends ICommand {
  reservationId: string;
  reason: string;
}

export interface ISeatReservationCommand extends ICommand {
  reservationId: string;
  tableId: string;
}

// ── Loyalty Commands ──

export interface IEnrollLoyaltyCommand extends ICommand {
  customerId: string;
  programId: string;
}

export interface IRedeemLoyaltyCommand extends ICommand {
  customerId: string;
  pointsToRedeem: number;
  orderId: string;
}

export interface IAdjustLoyaltyPointsCommand extends ICommand {
  customerId: string;
  pointsDelta: number;
  reason: string;
}

// ── Delivery Commands ──

export interface ICreateDeliveryCommand extends ICommand {
  orderId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  instructions: string | null;
  estimatedMinutes: number;
}

export interface IUpdateDeliveryStatusCommand extends ICommand {
  deliveryId: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
}

export interface IAssignDriverCommand extends ICommand {
  deliveryId: string;
  driverId: string;
}

// ── Printer Commands ──

export interface IAddPrinterCommand extends ICommand {
  name: string;
  printerType: 'receipt' | 'kitchen' | 'bar' | 'label';
  ipAddress: string | null;
  port: number | null;
  paperSize: '58mm' | '80mm';
  isActive: boolean;
}

export interface IUpdatePrinterCommand extends ICommand {
  printerId: string;
  name?: string;
  ipAddress?: string | null;
  port?: number | null;
  isActive?: boolean;
}

export interface IPrintReceiptCommand extends ICommand {
  orderId: string;
  printerId: string;
  copyCount: number;
}

export interface IPrintKitchenTicketCommand extends ICommand {
  ticketId: string;
  printerId: string;
}

// ── Backup Commands ──

export interface ICreateBackupCommand extends ICommand {
  type: 'manual' | 'automatic' | 'pre-sync' | 'pre-migration';
  label: string | null;
  entityTypes?: string[];
}

export interface IRestoreBackupCommand extends ICommand {
  backupId: string;
  createSafetyBackup: boolean;
}

export interface IDeleteBackupCommand extends ICommand {
  backupId: string;
}

// ── Sync Commands ──

export interface IForceSyncCommand extends ICommand {
  entityTypes?: string[];
}

export interface IResetSyncCommand extends ICommand {
  reason: string;
}

export interface IClearSyncQueueCommand extends ICommand {
  reason: string;
}

// ── Auth Commands ──

export interface ILoginCommand {
  email: string;
  password: string;
  deviceId: string;
}

export interface ILogoutCommand extends ICommand {
  reason: string | null;
}

export interface IRefreshTokenCommand extends ICommand {
  refreshToken: string;
}

// ── Workspace Commands ──

export interface ICreateWorkspaceCommand extends ICommand {
  name: string;
  plan: string;
}

export interface IUpdateWorkspaceCommand extends ICommand {
  workspaceId: string;
  name?: string;
}

// ── Branch Commands ──

export interface ICreateBranchCommand extends ICommand {
  workspaceId: string;
  name: string;
  code: string;
  address: Record<string, unknown>;
}

export interface IUpdateBranchCommand extends ICommand {
  branchId: string;
  name?: string;
  address?: Record<string, unknown>;
}

export interface ISwitchBranchCommand extends ICommand {
  targetBranchId: string;
}

// ── Counter Commands ──

export interface IOpenCounterCommand extends ICommand {
  employeeId: string;
  openingBalanceCents: number;
}

export interface ICloseCounterCommand extends ICommand {
  counterId: string;
  closingBalanceCents: number;
  notes: string | null;
}
