/**
 * settings-handlers.ts — IPC handlers for Settings channels.
 */

import { ipcMain } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { IApplicationContext } from '../../application/common/ApplicationContext';
import { toIpcResult, toIpcListResult } from '../restaurant-ipc-types';
import type { AppSetting } from '../../types/models';

function fail(err: Error): any {
  return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err };
}

export function registerSettingsHandlers(
  commandDispatcher: CommandDispatcher,
  queryDispatcher: QueryDispatcher,
  getContext: () => IApplicationContext,
): void {
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_SET, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IUpdateSettingCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_SET_BATCH, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IBulkUpdateSettingsCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_DELETE, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IResetSettingCommand', data, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  // Queries
  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_GET, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<AppSetting>('IGetSettingQuery', data, getContext());
      const value = r.isSuccess && r.value ? (r.value.items[0] as AppSetting)?.value ?? null : null;
      return toIpcResult({ isSuccess: true, value, error: null, errorCode: null, validationErrors: [], warnings: [], exception: null } as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_LIST, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<AppSetting>('IGetSettingsQuery', {}, getContext());
      return toIpcListResult(r);
    } catch (err) { return toIpcListResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_HAS_KEY, async (_e, data) => {
    try {
      const r = await queryDispatcher.dispatch<AppSetting>('IGetSettingQuery', data, getContext());
      const exists = r.isSuccess && r.value && r.value.items.length > 0;
      return toIpcResult({ isSuccess: true, value: exists, error: null, errorCode: null, validationErrors: [], warnings: [], exception: null } as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_EXPORT, async (_e, _data) => {
    try {
      const r = await queryDispatcher.dispatch<AppSetting>('IGetSettingsQuery', {}, getContext());
      const json = JSON.stringify(r.value?.items ?? []);
      return toIpcResult({ isSuccess: true, value: json, error: null, errorCode: null, validationErrors: [], warnings: [], exception: null } as any);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });

  ipcMain.handle(RESTAURANT_IPC_CHANNELS.SETTINGS_IMPORT, async (_e, data) => {
    try {
      const r = await commandDispatcher.dispatch<void>('IBulkUpdateSettingsCommand', { settings: JSON.parse(data.json) }, getContext());
      return toIpcResult(r);
    } catch (err) { return toIpcResult(fail(err as Error)); }
  });
}
