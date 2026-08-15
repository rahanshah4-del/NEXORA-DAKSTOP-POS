/**
 * PerformanceMiddleware.ts — Records execution metrics for every operation.
 *
 * Priority: 900 (always last, wraps everything).
 * Tracks: total calls, failures, average duration, per-command-type breakdown.
 */

import type { IMiddleware, PipelineDelegate } from '../common/ApplicationPipeline';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { Result } from '../common/Result';
import type { IMetrics } from '../common/IApplicationService';
import { MiddlewarePriority } from '../common/ApplicationPipeline';

export class PerformanceMiddleware implements IMiddleware {
  public readonly name = 'Performance';
  public readonly priority = MiddlewarePriority.Metrics;

  constructor(private _metrics: IMetrics) {}

  async invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>> {
    const startTime = performance.now();

    const commandType =
      commandOrQuery && typeof commandOrQuery === 'object'
        ? (commandOrQuery as Record<string, unknown>)['__commandType'] ??
          (commandOrQuery as object).constructor?.name ??
          'unknown'
        : 'unknown';

    const isCommand =
      commandType.includes('Command') ||
      (commandOrQuery &&
        typeof commandOrQuery === 'object' &&
        (commandOrQuery as Record<string, unknown>)['commandId'] !== undefined);

    const operationType = isCommand ? 'command' : 'query';

    try {
      const result = await next();
      const durationMs = performance.now() - startTime;

      this._metrics.recordExecution(operationType, commandType, durationMs, result.isSuccess);

      if (!result.isSuccess) {
        this._metrics.incrementCounter('failures', {
          operationType,
          commandType,
          errorCode: result.errorCode ?? 'UNKNOWN',
        });
      }

      return result;
    } catch (err) {
      const durationMs = performance.now() - startTime;
      this._metrics.recordExecution(operationType, commandType, durationMs, false);
      this._metrics.incrementCounter('exceptions', {
        operationType,
        commandType,
        errorType: (err as Error).constructor.name,
      });
      throw err;
    }
  }
}
