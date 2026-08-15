/**
 * kitchen-handlers.ts — IPC handlers for Kitchen (KDS) channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerKitchenHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_CREATE_TICKET, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<KitchenTicket>('ICreateKitchenTicketCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_STATUS, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('ICompleteKitchenTicketCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_COMPLETE_TICKET, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('ICompleteKitchenTicketCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_ITEM_STATUS, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateTicketItemStatusCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_MARK_ALL_READY, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IMarkItemReadyCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  // Queries
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<KitchenTicket>('IGetActiveTicketsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_GET_QUEUE, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<KitchenTicket>('IGetKitchenQueueQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.KITCHEN_GET_TICKET_ITEMS, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<KitchenTicketItem>('IGetTicketItemsQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });
}
