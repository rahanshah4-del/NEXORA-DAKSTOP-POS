/**
 * staff-handlers.ts — IPC handlers for Staff/Employee/Shift channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { Employee, Shift } from '../../types/models';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerStaffHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_CREATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Employee>('ICreateEmployeeCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_UPDATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Employee>('IUpdateEmployeeCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_DEACTIVATE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IDeactivateEmployeeCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_IN, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Shift>('IClockInCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_OUT, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<Shift>('IClockOutCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  // Queries
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Employee>('IGetStaffQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_LIST, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Employee>('IGetStaffQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_LIST_ACTIVE, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<Employee>('IGetStaffQuery', {}, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFT, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Shift>('IGetActiveShiftsQuery', data, getContext());
      return toIpcResult(r.map((p) => p.items[0] ?? null) as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFTS, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<Shift>('IGetActiveShiftsQuery', {}, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.STAFF_GET_SHIFT_HISTORY, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<Shift>('IGetShiftHistoryQuery', data, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });
}
