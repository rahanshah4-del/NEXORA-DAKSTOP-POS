/**
 * customer-handlers.ts — IPC handlers for Customer channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { Customer } from '../../types/models';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerCustomerHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_CREATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Customer>('ICreateCustomerCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_UPDATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Customer>('IUpdateCustomerCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_DELETE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateCustomerCommand', { customerId: data.customerId, isActive: false }, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Customer>('IGetCustomerQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Customer>('ISearchCustomersQuery', { ...data, query: '' }, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_SEARCH, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Customer>('ISearchCustomersQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_BY_EMAIL, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Customer>('IGetCustomerByEmailQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_TOP, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Customer>('IGetTopCustomersQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });
}
