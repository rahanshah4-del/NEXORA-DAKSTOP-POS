/**
 * useOptimisticMutation — Optimistic UI hook with automatic rollback.
 *
 * Pattern:
 *   1. User action → immediately update local state (optimistic)
 *   2. Send IPC command in background
 *   3. If success → keep optimistic state
 *   4. If failure → rollback to previous state + show error toast
 *
 * Usage:
 *   const { mutate, isLoading } = useOptimisticMutation(
 *     async (input) => window.restaurant.products.create(input),
 *     { onSuccess: (result) => refetch(), rollbackMessage: 'Failed to create' }
 *   );
 */

import { useState, useCallback, useRef } from 'react';
import { notifyError } from '@/stores/toast-store';

export interface OptimisticOptions<TInput, TResult> {
  /** Called on successful mutation. */
  onSuccess?: (result: TResult, input: TInput) => void;
  /** Called on failed mutation (after rollback). */
  onError?: (error: Error, input: TInput) => void;
  /** Optimistic update to apply immediately. */
  optimisticUpdate?: (input: TInput) => void;
  /** Rollback function (reverse of optimisticUpdate). */
  rollback?: (input: TInput) => void;
  /** Toast message on failure. */
  rollbackMessage?: string;
}

export function useOptimisticMutation<TInput = unknown, TResult = unknown>(
  mutationFn: (input: TInput) => Promise<{ success: boolean; data?: TResult; error?: string }>,
  options: OptimisticOptions<TInput, TResult> = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(async (input: TInput): Promise<{ success: boolean; data?: TResult; error?: string }> => {
    // 1. Apply optimistic update immediately
    optionsRef.current.optimisticUpdate?.(input);

    setIsLoading(true);

    try {
      // 2. Execute actual mutation
      const result = await mutationFn(input);

      if (result.success) {
        // 3. Success — keep optimistic state
        optionsRef.current.onSuccess?.(result.data as TResult, input);
      } else {
        // 4. Failure — rollback
        optionsRef.current.rollback?.(input);
        optionsRef.current.onError?.(new Error(result.error ?? 'Unknown error'), input);
        if (optionsRef.current.rollbackMessage) {
          notifyError(optionsRef.current.rollbackMessage, result.error ?? '');
        }
      }

      return result;
    } catch (err: any) {
      // 5. Exception — rollback
      optionsRef.current.rollback?.(input);
      optionsRef.current.onError?.(err, input);
      if (optionsRef.current.rollbackMessage) {
        notifyError(optionsRef.current.rollbackMessage, err.message);
      }
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn]);

  return { mutate, isLoading };
}
