/**
 * useQuery.ts — Generic query dispatch hook.
 *
 * Routes queries through IPC (window.restaurant) when running in Electron,
 * falls back to local stubs when running in browser dev mode.
 *
 * Phase 16: Connected to real backend via IPC.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PaginatedResult } from '../../application/common/IQueryHandler';
import type { Result } from '../../application/common/Result';
import { dispatchQueryViaIpc, isIpcAvailable } from './ipc-bridge';

// ── Hook State ──

export interface UseQueryState<TResult = unknown> {
  data: PaginatedResult<TResult> | null;
  result: Result<PaginatedResult<TResult>> | null;
  isLoading: boolean;
  error: string | null;
  items: TResult[];
  totalCount: number;
  refetch: (queryOverride?: unknown) => Promise<Result<PaginatedResult<TResult>>>;
  reset: () => void;
}

export interface UseQueryOptions {
  autoFetch?: boolean;
  initialQuery?: unknown;
  enabled?: boolean;
}

// ── Hook ──

export function useQuery<TResult = unknown>(
  queryType: string,
  options: UseQueryOptions = {},
): UseQueryState<TResult> {
  const [data, setData] = useState<PaginatedResult<TResult> | null>(null);
  const [result, setResult] = useState<Result<PaginatedResult<TResult>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialQueryRef = useRef(options.initialQuery);
  const mountedRef = useRef(false);

  const refetch = useCallback(
    async (queryOverride?: unknown): Promise<Result<PaginatedResult<TResult>>> => {
      const query = queryOverride ?? initialQueryRef.current ?? {};
      setIsLoading(true);
      setError(null);

      try {
        if (query && typeof query === 'object') {
          (query as Record<string, unknown>)['__commandType'] = queryType;
        }

        // Phase 16: Route through IPC when available
        const res: Result<PaginatedResult<TResult>> = isIpcAvailable()
          ? await dispatchQueryViaIpc<TResult>(queryType, query)
          : await fallbackQuery<TResult>(queryType, query);

        setResult(res);
        if (res.isSuccess && res.value) setData(res.value);
        else setError(res.error ?? 'Query failed');
        return res;
      } catch (err) {
        const message = (err as Error).message;
        setError(message);
        const failResult = {
          isSuccess: false, value: null, error: message,
          errorCode: null, validationErrors: [], warnings: [], exception: err as Error,
        } as unknown as Result<PaginatedResult<TResult>>;
        setResult(failResult);
        return failResult;
      } finally {
        setIsLoading(false);
      }
    },
    [queryType],
  );

  useEffect(() => {
    if (options.autoFetch && !mountedRef.current) {
      mountedRef.current = true;
      refetch();
    }
  }, [options.autoFetch, refetch]);

  const reset = useCallback(() => {
    setData(null); setResult(null); setIsLoading(false); setError(null);
    mountedRef.current = false;
  }, []);

  return {
    data, result, isLoading, error,
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    refetch, reset,
  };
}

/** Fallback when IPC is unavailable (browser dev mode). */
async function fallbackQuery<T>(_queryType: string, _query: unknown): Promise<Result<PaginatedResult<T>>> {
  await new Promise((r) => setTimeout(r, 200));
  return {
    isSuccess: true,
    value: { items: [], totalCount: 0, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 0, executionTimeMs: 0 },
    error: null, errorCode: null, validationErrors: [], warnings: [], exception: null,
  } as unknown as Result<PaginatedResult<T>>;
}
