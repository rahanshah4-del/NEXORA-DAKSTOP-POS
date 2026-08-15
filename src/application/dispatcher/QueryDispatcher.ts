/**
 * QueryDispatcher.ts — Central query dispatcher with middleware pipeline.
 *
 * Queries are always read-only — no transactions, no domain events.
 * The pipeline still runs validation, authorization, logging, and metrics.
 */

import type { Result } from '../common/Result';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { PaginatedResult } from '../common/IQueryHandler';
import { ApplicationPipeline } from '../common/ApplicationPipeline';
import type { DispatcherRegistry } from './DispatcherRegistry';
import type { DependencyContainer } from '../di/DependencyContainer';

export class QueryDispatcher {
  private _pipeline: ApplicationPipeline;

  constructor(
    private _registry: DispatcherRegistry,
    private _container: DependencyContainer,
    pipeline: ApplicationPipeline,
  ) {
    this._pipeline = pipeline;
  }

  /** Get the middleware pipeline. */
  get pipeline(): ApplicationPipeline {
    return this._pipeline;
  }

  /**
   * Dispatch a query to its handler.
   *
   * @param queryType The query interface name (e.g., 'IGetOrderQuery').
   * @param query     The query payload.
   * @param context   The application context.
   * @returns PaginatedResult<T> from the handler.
   */
  async dispatch<TResult>(
    queryType: string,
    query: unknown,
    context: IApplicationContext,
  ): Promise<Result<PaginatedResult<TResult>>> {
    // 1. Resolve handler entry
    const entry = this._registry.resolveQuery(queryType);
    if (!entry) {
      return {
        isSuccess: false,
        value: null,
        error: `No handler registered for query type: ${queryType}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: null,
      } as unknown as Result<PaginatedResult<TResult>>;
    }

    // 2. Resolve handler instance
    let handler: Record<string, unknown>;
    try {
      handler = this._container.resolve<Record<string, unknown>>(entry.handlerToken);
    } catch (err) {
      return {
        isSuccess: false,
        value: null,
        error: `Failed to resolve handler for '${queryType}': ${(err as Error).message}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: err as Error,
      } as unknown as Result<PaginatedResult<TResult>>;
    }

    // 3. Get the handler method
    const method = handler[entry.methodName] as
      | ((query: unknown, context: IApplicationContext) => Promise<Result<PaginatedResult<TResult>>>)
      | undefined;

    if (typeof method !== 'function') {
      return {
        isSuccess: false,
        value: null,
        error: `Handler method '${entry.methodName}' not found on '${entry.handlerToken}'`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: null,
      } as unknown as Result<PaginatedResult<TResult>>;
    }

    // 4. Execute through pipeline
    try {
      return await this._pipeline.execute<PaginatedResult<TResult>>(context, query, () =>
        method.call(handler, query, context),
      );
    } catch (err) {
      return {
        isSuccess: false,
        value: null,
        error: `Unhandled error dispatching '${queryType}': ${(err as Error).message}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: err as Error,
      } as unknown as Result<PaginatedResult<TResult>>;
    }
  }

  /**
   * Check if a query type has a registered handler.
   */
  canDispatch(queryType: string): boolean {
    const entry = this._registry.resolveQuery(queryType);
    if (!entry) return false;
    return this._container.has(entry.handlerToken);
  }
}
