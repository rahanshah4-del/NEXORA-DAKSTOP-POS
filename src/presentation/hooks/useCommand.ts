/**
 * useCommand.ts — Generic command dispatch hook.
 *
 * Routes commands through IPC (window.restaurant) when running in Electron,
 * falls back to ApplicationProvider context when running locally.
 *
 * Phase 16: Connected to real backend via IPC.
 */

import { useState, useCallback } from 'react';
import type { Result } from '../../application/common/Result';
import { dispatchCommandViaIpc, isIpcAvailable } from './ipc-bridge';

// ── Hook State ──

export interface UseCommandState<TResult = unknown> {
  result: Result<TResult> | null;
  isLoading: boolean;
  error: string | null;
  execute: (command: unknown) => Promise<Result<TResult>>;
  reset: () => void;
}

// ── Hook ──

export function useCommand<TResult = void>(
  commandType: string,
): UseCommandState<TResult> {
  const [result, setResult] = useState<Result<TResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (command: unknown): Promise<Result<TResult>> => {
      setIsLoading(true);
      setError(null);

      try {
        if (command && typeof command === 'object') {
          (command as Record<string, unknown>)['__commandType'] = commandType;
        }

        // Phase 16: Route through IPC when available
        const res: Result<TResult> = isIpcAvailable()
          ? await dispatchCommandViaIpc<TResult>(commandType, command)
          : await fallbackCommand<TResult>(commandType, command);

        setResult(res);
        if (!res.isSuccess) setError(res.error ?? 'Command failed');
        return res;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        const failResult = {
          isSuccess: false, value: null, error: message,
          errorCode: null, validationErrors: [], warnings: [], exception: err as Error,
        } as unknown as Result<TResult>;
        setResult(failResult);
        return failResult;
      } finally {
        setIsLoading(false);
      }
    },
    [commandType],
  );

  const reset = useCallback(() => {
    setResult(null); setIsLoading(false); setError(null);
  }, []);

  return { result, isLoading, error, execute, reset };
}

/** Fallback when IPC is unavailable (browser dev mode). Returns mock success. */
async function fallbackCommand<T>(commandType: string, _command: unknown): Promise<Result<T>> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));
  const fallbackId = `${commandType.replace('I', '').replace('Command', '').toLowerCase()}_${Date.now()}`;
  return {
    isSuccess: true,
    value: { id: fallbackId } as unknown as T,
    error: null, errorCode: null, validationErrors: [], warnings: [], exception: null,
  } as unknown as Result<T>;
}
