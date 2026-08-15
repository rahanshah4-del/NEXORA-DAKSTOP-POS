/**
 * table-handlers.ts — IPC handlers for Table channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { Table } from '../../types/models';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerTableHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_CREATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Table>('ICreateTableCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_UPDATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Table>('IUpdateTableCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_DELETE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateTableCommand', { tableId: data.tableId, status: 'maintenance' }, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_UPDATE_STATUS, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateTableStatusCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_ALLOCATE, async (_e, data) => {
    try {
      // Allocation is a query operation (find best table, no mutation)
      const r = await queryDispatcher.dispatch<Table>('IGetTablesQuery', {}, getContext());
      if (!r.isSuccess || !r.value) return toIpcResult(fail(new Error('No tables available')));
      const tables = r.value.items;
      const available = tables.filter((t: Table) => t.status === 'available');
      const sorted = available.sort((a: Table, b: Table) => a.capacity - b.capacity);
      const fit = sorted.find((t: Table) => t.capacity >= data.partySize) ?? sorted[sorted.length - 1];
      return toIpcResult({
        isSuccess: true, value: fit ? { tableIds: [fit.id], totalCapacity: fit?.capacity ?? 0 } : null,
        error: null, errorCode: null, validationErrors: [], warnings: [], exception: null,
      } as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_ASSIGN_ORDER, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IOpenTableCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_CLEAR_ORDER, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('ICloseTableCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  // Queries
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Table>('IGetTablesQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Table>('IGetTablesQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.TABLES_LIST_AVAILABLE, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<Table>('IGetTablesQuery', {}, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });
}
