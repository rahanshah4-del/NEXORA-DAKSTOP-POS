/**
 * payment-handlers.ts — IPC handlers for Payment channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { PaymentRecord } from '../../repositories/IPaymentRepository';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerPaymentHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_PROCESS, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<PaymentRecord>('IProcessPaymentCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_REFUND, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<PaymentRecord>('IRefundPaymentCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_VOID, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IVoidPaymentCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<PaymentRecord>('IGetPaymentsQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<PaymentRecord>('IGetPaymentsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST_BY_ORDER, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<PaymentRecord>('IGetPaymentsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PAYMENTS_TOTALS_BY_METHOD, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Record<string, unknown>>('IGetPaymentSummaryQuery', data, getContext());
      return toIpcResult(r.map((p) => (p.items[0] ?? {}) as Record<string, number>) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });
}
