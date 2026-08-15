/**
 * Miscellaneous Query Interfaces.
 * CQRS queries for Staff, Reservations, Delivery,
 * Loyalty, Printer, Backup, Sync, Auth, Workspace, Branch.
 * Interface only. No implementation.
 */

import type { IQuery } from '../shared/IQuery';

// ── Staff Queries ──

export interface IGetStaffQuery extends IQuery<unknown> {
  employeeId?: string;
  role?: string;
  isActive?: boolean;
}

export interface IGetActiveShiftsQuery extends IQuery<unknown> {
  employeeId?: string;
}

export interface IGetShiftHistoryQuery extends IQuery<unknown> {
  employeeId: string;
  startDate: string;
  endDate: string;
}

// ── Table Queries ──

export interface IGetTablesQuery extends IQuery<unknown> {
  section?: string;
  status?: string;
}

export interface IGetTableLayoutQuery extends IQuery<unknown> {
  // Returns floor plan layout with positions
}

// ── Reservation Queries ──

export interface IGetReservationsQuery extends IQuery<unknown> {
  date: string;
  tableId?: string;
  status?: string;
}

export interface IGetUpcomingReservationsQuery extends IQuery<unknown> {
  limit?: number;
}

// ── Loyalty Queries ──

export interface IGetLoyaltyPointsQuery extends IQuery<unknown> {
  customerId: string;
}

export interface IGetLoyaltyHistoryQuery extends IQuery<unknown> {
  customerId: string;
}

// ── Delivery Queries ──

export interface IGetDeliveriesQuery extends IQuery<unknown> {
  status?: string;
  driverId?: string;
  date?: string;
}

export interface IGetActiveDeliveriesQuery extends IQuery<unknown> {
  // Currently in-progress deliveries
}

// ── Printer Queries ──

export interface IGetPrintersQuery extends IQuery<unknown> {
  printerType?: string;
}

export interface IGetPrintJobHistoryQuery extends IQuery<unknown> {
  printerId?: string;
  startDate?: string;
  endDate?: string;
}

// ── Backup Queries ──

export interface IGetBackupsQuery extends IQuery<unknown> {
  type?: string;
}

export interface IGetBackupDetailQuery extends IQuery<unknown> {
  backupId: string;
}

// ── Sync Queries ──

export interface IGetSyncStatusQuery extends IQuery<unknown> {
  // Current sync state
}

export interface IGetSyncHistoryQuery extends IQuery<unknown> {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface IGetQueueStatsQuery extends IQuery<unknown> {
  // Current queue statistics
}

// ── Auth Queries ──

export interface IGetCurrentUserQuery extends IQuery<unknown> {
  // Currently authenticated user
}

export interface IGetUserPermissionsQuery extends IQuery<unknown> {
  userId: string;
}

// ── Workspace Queries ──

export interface IGetWorkspaceQuery extends IQuery<unknown> {
  workspaceId?: string;
}

export interface IGetWorkspaceStatsQuery extends IQuery<unknown> {
  // Usage statistics
}

// ── Branch Queries ──

export interface IGetBranchQuery extends IQuery<unknown> {
  branchId: string;
}

export interface IGetBranchesQuery extends IQuery<unknown> {
  workspaceId: string;
}

// ── Counter Queries ──

export interface IGetActiveCounterQuery extends IQuery<unknown> {
  // Currently open cash counter/drawer
}

export interface IGetCounterHistoryQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

// ── Payment Queries ──

export interface IGetPaymentsQuery extends IQuery<unknown> {
  orderId?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}

export interface IGetPaymentSummaryQuery extends IQuery<unknown> {
  date: string;
}

// ── Settings Queries ──

export interface IGetSettingsQuery extends IQuery<unknown> {
  keys?: string[];
}

export interface IGetSettingQuery extends IQuery<unknown> {
  key: string;
}
