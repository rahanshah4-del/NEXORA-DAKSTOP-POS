/**
 * product-handlers.ts — IPC handlers for Product channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { Product } from '../../types/models';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerProductHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_CREATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Product>('ICreateProductCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Product>('IUpdateProductCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_DELETE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IDeactivateProductCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE_PRICE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateProductPriceCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_BULK_UPDATE_PRICE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Product[]>('IBulkUpdatePriceCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  // Queries
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Product>('IGetProductQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Product>('IGetMenuQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST_ACTIVE, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Product>('IGetMenuQuery', { ...data, includeInactive: false }, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_SEARCH, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Product>('ISearchProductsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.PRODUCTS_GET_BY_SKU, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Product>('ISearchProductsQuery', { query: data.sku }, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });
}
