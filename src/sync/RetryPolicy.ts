/**
 * RetryPolicy — defines retry behavior for failed sync operations.
 * Interface only. No implementation.
 */

import type { RetryConfig } from './SyncTypes';
import { DEFAULT_RETRY_CONFIG } from './SyncConstants';

// ── Retry Policy Interface ──

export interface IRetryPolicy {
  /** Calculate the delay before the next retry attempt */
  calculateDelay(retryCount: number, config?: RetryConfig): number;

  /** Determine whether an operation should be retried */
  shouldRetry(retryCount: number, error: string | null, config?: RetryConfig): boolean;

  /** Get the current retry configuration */
  getConfig(): RetryConfig;
}

// ── Retry Policy Config Provider ──

export interface IRetryPolicyConfig {
  getRetryConfig(): RetryConfig;
  getDefaultConfig(): RetryConfig;
}

// ── Default config export ──

export { DEFAULT_RETRY_CONFIG };
