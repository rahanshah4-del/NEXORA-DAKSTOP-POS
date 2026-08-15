/**
 * useSettings.ts — Settings hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess } from '@/stores/toast-store';
import type { AppSetting } from '../../types/models';

export function useSettings() {
  const updateSetting = useCommand<void>('IUpdateSettingCommand');
  const bulkUpdate = useCommand<void>('IBulkUpdateSettingsCommand');
  const resetSetting = useCommand<void>('IResetSettingCommand');
  const settingsQuery = useQuery<AppSetting>('IGetSettingsQuery', { autoFetch: false });

  const fetchSettings = useCallback(async () => settingsQuery.refetch(), [settingsQuery]);

  const setSingle = useCallback(async (key: string, value: string) => {
    const r = await updateSetting.execute({ key, value });
    if (r.isSuccess) notifySuccess('Saved', `Setting updated`);
    return r;
  }, [updateSetting]);

  const settingsMap: Record<string, string> = {};
  for (const item of (settingsQuery.data?.items ?? []) as AppSetting[]) {
    settingsMap[item.key] = item.value;
  }

  return {
    updateSetting: setSingle, setBatch: bulkUpdate.execute,
    resetSetting: resetSetting.execute,
    settings: settingsMap, isLoading: settingsQuery.isLoading,
    refetchSettings: fetchSettings,
  };
}
