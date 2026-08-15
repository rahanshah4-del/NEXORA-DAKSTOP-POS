/**
 * Report & Analytics Query Interfaces.
 * CQRS queries for reports, analytics, and dashboard data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';

export interface IGetSalesReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'week' | 'month' | 'hour';
}

export interface IGetRevenueSummaryQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetTopSellingProductsQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
  limit?: number;
}

export interface IGetPaymentMethodBreakdownQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetEmployeePerformanceQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetTableTurnoverQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetDailySummaryQuery extends IQuery<unknown> {
  date: string;
}

export interface IGetTaxReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetInventoryReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetStaffHoursReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
  employeeId?: string;
}

export interface IGetLoyaltyReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetDeliveryReportQuery extends IQuery<unknown> {
  startDate: string;
  endDate: string;
}

export interface IGetDashboardStatsQuery extends IQuery<unknown> {
  // Today's dashboard at-a-glance stats
}
