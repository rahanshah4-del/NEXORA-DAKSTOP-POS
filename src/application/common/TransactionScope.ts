/**
 * TransactionScope.ts — Managed transaction scope for command handlers.
 *
 * Wraps a UnitOfWork in a disposable scope. Usage:
 *
 *   using (const scope = new TransactionScope(uowFactory)) {
 *     await handler.execute(command, ctx);
 *     scope.complete();  // marks for commit
 *   }  // dispose() commits or rolls back
 */

import type { IUnitOfWork, IUnitOfWorkFactory } from './UnitOfWork';

export interface ITransactionScope extends Disposable {
  /** The underlying unit of work. */
  readonly unitOfWork: IUnitOfWork;

  /** Mark the transaction as successful (commit on dispose). */
  complete(): void;

  /** Whether the scope has been marked complete. */
  readonly isCompleted: boolean;
}

export class TransactionScope implements ITransactionScope {
  private _uow: IUnitOfWork;
  private _completed = false;
  private _disposed = false;

  constructor(uowFactory: IUnitOfWorkFactory) {
    this._uow = uowFactory.create();
    this._uow.begin();
  }

  get unitOfWork(): IUnitOfWork {
    return this._uow;
  }

  get isCompleted(): boolean {
    return this._completed;
  }

  complete(): void {
    this._completed = true;
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    try {
      if (this._completed) {
        this._uow.commit();
      } else {
        this._uow.rollback();
      }
    } finally {
      this._uow.dispose();
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

/**
 * Create a transaction scope and execute a callback within it.
 * Commits if the callback returns a success Result, rolls back otherwise.
 */
export async function executeInTransaction<T>(
  uowFactory: IUnitOfWorkFactory,
  fn: (uow: IUnitOfWork) => Promise<T>,
): Promise<T> {
  const uow = uowFactory.create();
  uow.begin();

  try {
    const result = await fn(uow);
    uow.commit();
    return result;
  } catch (error) {
    uow.rollback();
    throw error;
  } finally {
    uow.dispose();
  }
}
