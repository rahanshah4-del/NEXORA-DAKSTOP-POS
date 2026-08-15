/**
 * TransactionMiddleware.ts — Wraps command execution in a Unit of Work.
 *
 * Priority: 400 (after logging, before handler).
 * Only wraps commands (mutations). Queries skip the transaction.
 *
 * Commit on success, rollback on failure.
 */

import type { IMiddleware, PipelineDelegate } from '../common/ApplicationPipeline';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { Result } from '../common/Result';
import type { IUnitOfWorkFactory } from '../common/UnitOfWork';
import { MiddlewarePriority } from '../common/ApplicationPipeline';

export class TransactionMiddleware implements IMiddleware {
  public readonly name = 'Transaction';
  public readonly priority = MiddlewarePriority.Transaction;

  constructor(private _uowFactory: IUnitOfWorkFactory) {}

  async invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>> {
    // Skip transaction for queries (read-only)
    // Commands can be identified by convention (command type contains 'Command')
    const commandType =
      commandOrQuery && typeof commandOrQuery === 'object'
        ? (commandOrQuery as Record<string, unknown>)['__commandType'] ??
          (commandOrQuery as object).constructor?.name ??
          ''
        : '';

    const isCommand =
      commandType.includes('Command') ||
      (commandOrQuery &&
        typeof commandOrQuery === 'object' &&
        (commandOrQuery as Record<string, unknown>)['commandId'] !== undefined);

    if (!isCommand) {
      // Query — no transaction needed
      return next();
    }

    // Create transaction scope
    const uow = this._uowFactory.create();
    uow.begin();

    try {
      const result = await next();

      if (result.isSuccess) {
        uow.commit();
      } else {
        uow.rollback();
      }

      return result;
    } catch (err) {
      uow.rollback();
      throw err;
    } finally {
      uow.dispose();
    }
  }
}
