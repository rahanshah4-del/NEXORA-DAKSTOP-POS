import { useCallback } from 'react';

export function useIpc() {
  const invoke = useCallback(
    async <T>(channel: string, ...args: unknown[]): Promise<T> => {
      if (!window.api) {
        throw new Error('IPC bridge not available — not running in Electron');
      }
      return window.api.db.query(channel, args) as T;
    },
    [],
  );

  const dbQuery = useCallback(async (sql: string, params?: unknown[]) => {
    if (!window.api) throw new Error('IPC not available');
    return window.api.db.query(sql, params);
  }, []);

  const dbExecute = useCallback(async (sql: string, params?: unknown[]) => {
    if (!window.api) throw new Error('IPC not available');
    return window.api.db.execute(sql, params);
  }, []);

  const isElectron = typeof window !== 'undefined' && !!window.api;

  return { invoke, dbQuery, dbExecute, isElectron };
}
