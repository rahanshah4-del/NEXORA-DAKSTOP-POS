/**
 * ApplicationLogger.ts — Structured logger for the application layer.
 *
 * Outputs to console in development; can be wired to file/cloud in production.
 */

import type { ILogger } from '../common/IApplicationService';

export class ApplicationLogger implements ILogger {
  readonly serviceName = 'ApplicationLogger';

  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(`[DEBUG] ${message}`, meta ?? '');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(`[INFO] ${message}`, meta ?? '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, meta ?? '');
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    console.error(`[ERROR] ${message}`, error?.message ?? '', meta ?? '');
  }
}
