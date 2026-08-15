/**
 * LoggingMiddleware.ts — Logs every command and query execution.
 *
 * Priority: 300 (after auth, before transaction).
 * Logs: request ID, command/query type, user, duration, result status.
 */

import type { IMiddleware, PipelineDelegate } from '../common/ApplicationPipeline';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { Result } from '../common/Result';
import type { ILogger } from '../common/IApplicationService';
import { MiddlewarePriority } from '../common/ApplicationPipeline';

export class LoggingMiddleware implements IMiddleware {
  public readonly name = 'Logging';
  public readonly priority = MiddlewarePriority.Logging;

  constructor(private _logger: ILogger) {}

  async invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>> {
    const commandType =
      commandOrQuery && typeof commandOrQuery === 'object'
        ? (commandOrQuery as Record<string, unknown>)['__commandType'] ??
          (commandOrQuery as object).constructor?.name ??
          'unknown'
        : 'unknown';

    const startTime = Date.now();
    const userId = context.currentUser?.id ?? 'anonymous';

    this._logger.debug(`[${context.requestId}] ${commandType} — started by ${userId}`, {
      commandType,
      requestId: context.requestId,
      correlationId: context.correlationId,
      userId,
      workspaceId: context.workspaceId,
      branchId: context.branchId,
    });

    try {
      const result = await next();
      const durationMs = Date.now() - startTime;

      if (result.isSuccess) {
        this._logger.info(
          `[${context.requestId}] ${commandType} — success (${durationMs}ms)`,
          { commandType, requestId: context.requestId, durationMs, success: true },
        );
      } else {
        this._logger.warn(
          `[${context.requestId}] ${commandType} — failed: ${result.error} (${durationMs}ms)`,
          {
            commandType,
            requestId: context.requestId,
            durationMs,
            success: false,
            error: result.error,
            errorCode: result.errorCode,
          },
        );
      }

      return result;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      this._logger.error(
        `[${context.requestId}] ${commandType} — exception (${durationMs}ms)`,
        err as Error,
        { commandType, requestId: context.requestId, durationMs },
      );
      throw err;
    }
  }
}
