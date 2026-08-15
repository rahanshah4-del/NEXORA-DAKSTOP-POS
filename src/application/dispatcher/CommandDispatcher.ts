/**
 * CommandDispatcher.ts — Central command dispatcher with middleware pipeline.
 *
 * Flow:
 *   1. Resolve handler from registry
 *   2. Run through middleware pipeline
 *   3. Execute the handler method
 *   4. Publish domain events
 *   5. Return Result<T>
 */

import type { Result } from '../common/Result';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { ICommandHandler } from '../common/ICommandHandler';
import { ApplicationPipeline } from '../common/ApplicationPipeline';
import type { DispatcherRegistry } from './DispatcherRegistry';
import type { DependencyContainer } from '../di/DependencyContainer';

export class CommandDispatcher {
  private _pipeline: ApplicationPipeline;

  constructor(
    private _registry: DispatcherRegistry,
    private _container: DependencyContainer,
    pipeline: ApplicationPipeline,
  ) {
    this._pipeline = pipeline;
  }

  /** Get the middleware pipeline (for adding/removing middleware). */
  get pipeline(): ApplicationPipeline {
    return this._pipeline;
  }

  /**
   * Dispatch a command to its handler.
   *
   * @param commandType The command interface name (e.g., 'ICreateOrderCommand').
   * @param command     The command payload.
   * @param context     The application context.
   * @returns Result<T> from the handler.
   */
  async dispatch<TResult = void>(
    commandType: string,
    command: unknown,
    context: IApplicationContext,
  ): Promise<Result<TResult>> {
    // 1. Resolve handler entry
    const entry = this._registry.resolveCommand(commandType);
    if (!entry) {
      return {
        isSuccess: false,
        value: null,
        error: `No handler registered for command type: ${commandType}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: null,
      } as unknown as Result<TResult>;
    }

    // 2. Resolve handler instance
    let handler: Record<string, unknown>;
    try {
      handler = this._container.resolve<Record<string, unknown>>(entry.handlerToken);
    } catch (err) {
      return {
        isSuccess: false,
        value: null,
        error: `Failed to resolve handler for '${commandType}': ${(err as Error).message}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: err as Error,
      } as unknown as Result<TResult>;
    }

    // 3. Get the handler method
    const method = handler[entry.methodName] as
      | ((command: unknown, context: IApplicationContext) => Promise<Result<TResult>>)
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
      } as unknown as Result<TResult>;
    }

    // 4. Execute through pipeline
    try {
      return await this._pipeline.execute<TResult>(context, command, () =>
        method.call(handler, command, context),
      );
    } catch (err) {
      return {
        isSuccess: false,
        value: null,
        error: `Unhandled error dispatching '${commandType}': ${(err as Error).message}`,
        errorCode: null,
        validationErrors: [],
        warnings: [],
        exception: err as Error,
      } as unknown as Result<TResult>;
    }
  }

  /**
   * Check if a command type has a registered handler.
   */
  canDispatch(commandType: string): boolean {
    const entry = this._registry.resolveCommand(commandType);
    if (!entry) return false;
    return this._container.has(entry.handlerToken);
  }
}
