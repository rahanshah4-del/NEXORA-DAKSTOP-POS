/**
 * order-handlers.ts — IPC handlers for Order channels.
 *
 * Each handler: ipcMain.handle → CommandDispatcher/QueryDispatcher → Result → IpcResult
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { Order, OrderItem } from '../../types/models';

export function registerOrderHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  // ── Commands ──

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_CREATE, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<Order>('ICreateOrderCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<Order>('IUpdateOrderCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_CANCEL, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<void>('ICancelOrderCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_ADD_ITEM, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<OrderItem>('IAddOrderItemCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_REMOVE_ITEM, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<void>('IRemoveOrderItemCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_STATUS, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<void>('IUpdateOrderStatusCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_PAYMENT, async (_event, data) => {
    try {
      const result = await commandDispatcher.dispatch<void>('IUpdatePaymentStatusCommand', data, getContext());
      return toIpcResult(result);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  // ── Queries ──

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_GET, async (_event, data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetOrderQuery', data, getContext());
      return toIpcResult(result.map((p) => p.items[0] ?? null) as any);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_GET_WITH_ITEMS, async (_event, data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetOrderQuery', data, getContext());
      return toIpcResult(result.map((p) => p.items[0] ?? null) as any);
    } catch (err) {
      return toIpcResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_LIST, async (_event, data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetActiveOrdersQuery', data, getContext());
      return toIpcListResult(result);
    } catch (err) {
      return toIpcListResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_ACTIVE, async (_event, _data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetActiveOrdersQuery', {}, getContext());
      return toIpcListResult(result);
    } catch (err) {
      return toIpcListResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_TABLE, async (_event, data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetOrdersByTableQuery', data, getContext());
      return toIpcListResult(result);
    } catch (err) {
      return toIpcListResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_STATUS, async (_event, data) => {
    try {
      const result = await queryDispatcher.dispatch<Order>('IGetOrdersByStatusQuery', data, getContext());
      return toIpcListResult(result);
    } catch (err) {
      return toIpcListResult({ isSuccess: false, value: null, error: (err as Error).message, errorCode: null, validationErrors: [], warnings: [], exception: err as Error } as any);
    }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.ORDERS_GET_NEXT_NUMBER, async () => {
    // Next order number is accessed via QueryDispatcher
    return toIpcResult({ isSuccess: true, value: 1, error: null, errorCode: null, validationErrors: [], warnings: [], exception: null } as any);
  });
}
