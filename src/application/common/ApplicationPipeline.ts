/**
 * ApplicationPipeline.ts — Middleware pipeline for command and query execution.
 *
 * Executes middleware in order:
 *   1. Validation
 *   2. Authorization
 *   3. Logging
 *   4. Transaction (commands only)
 *   5. Command / Query Handler
 *   6. Domain Events (commands only)
 *   7. Performance Metrics
 *
 * Each middleware can short-circuit the pipeline by returning a Result.
 */

import type { Result } from './Result';
import type { IApplicationContext } from './ApplicationContext';

// ── Middleware Delegate ──

/** A function that calls the next middleware in the chain. */
export type PipelineDelegate<TResult> = () => Promise<Result<TResult>>;

// ── Middleware Interface ──

export interface IMiddleware {
  /** Unique name for diagnostics. */
  readonly name: string;

  /** Priority — lower numbers execute first. */
  readonly priority: number;

  /**
   * Invoke the middleware.
   *
   * @param context The application context.
   * @param commandOrQuery The command or query being executed.
   * @param next The next middleware in the chain.
   * @returns A Result — may short-circuit the pipeline.
   */
  invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>>;
}

// ── Pipeline ──

export class ApplicationPipeline {
  private _middleware: IMiddleware[] = [];

  /** Register a middleware instance. */
  use(middleware: IMiddleware): this {
    this._middleware.push(middleware);
    this._middleware.sort((a, b) => a.priority - b.priority);
    return this;
  }

  /** Register multiple middleware at once. */
  useAll(middleware: IMiddleware[]): this {
    for (const m of middleware) {
      this._middleware.push(m);
    }
    this._middleware.sort((a, b) => a.priority - b.priority);
    return this;
  }

  /** Remove a middleware by name. */
  remove(name: string): this {
    this._middleware = this._middleware.filter((m) => m.name !== name);
    return this;
  }

  /** Get all registered middleware (in execution order). */
  get middleware(): ReadonlyArray<IMiddleware> {
    return this._middleware;
  }

  /**
   * Execute the pipeline with a terminal handler.
   *
   * @param context         The application context.
   * @param commandOrQuery  The command or query payload.
   * @param handler         The terminal handler function.
   */
  async execute<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    handler: () => Promise<Result<TResult>>,
  ): Promise<Result<TResult>> {
    if (this._middleware.length === 0) {
      return handler();
    }

    // Build the chain from the inside out
    let next: PipelineDelegate<TResult> = handler;

    for (let i = this._middleware.length - 1; i >= 0; i--) {
      const middleware = this._middleware[i];
      const currentNext = next;
      next = () => middleware.invoke(context, commandOrQuery, currentNext);
    }

    return next();
  }
}

// ── Middleware Priority Constants ──

export const MiddlewarePriority = {
  Validation: 100,
  Authorization: 200,
  Logging: 300,
  Transaction: 400,
  Metrics: 900, // Always last
} as const;
