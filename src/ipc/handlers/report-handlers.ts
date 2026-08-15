/**
 * report-handlers.ts — IPC handlers for Report channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerReportHandlers(
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_SALES, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetSalesReportQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_REVENUE, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetRevenueSummaryQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? {}) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_DASHBOARD, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetDashboardStatsQuery', {}, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? {}) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_TOP_PRODUCTS, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetTopSellingProductsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_PAYMENT_METHODS, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetPaymentMethodBreakdownQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_STAFF_PERFORMANCE, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetEmployeePerformanceQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.REPORTS_DAILY_SUMMARY, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetDailySummaryQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? {}) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });
}
