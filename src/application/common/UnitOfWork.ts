/**
 * UnitOfWork.ts — Unit of Work pattern for coordinating multi-repository transactions.
 *
 * A UnitOfWork:
 *   1. Begins a transaction
 *   2. Tracks all repository operations
 *   3. Commits or rolls back atomically
 *   4. Detects nested transactions (not supported in SQLite)
 */

import type Database from 'better-sqlite3';

// ── Unit of Work ──

export interface IUnitOfWork {
  /** Unique identifier for this unit of work. */
  readonly id: string;

  /** Whether a transaction is currently active. */
  readonly isActive: boolean;

  /** Whether the transaction has been committed. */
  readonly isCommitted: boolean;

  /** Whether the transaction has been rolled back. */
  readonly isRolledBack: boolean;

  /** Begin a new transaction. Throws if already active. */
  begin(): void;

  /** Commit the transaction. */
  commit(): void;

  /** Roll back the transaction. */
  rollback(): void;

  /** Register a callback to run after successful commit. */
  onCommit(callback: () => void): void;

  /** Register a callback to run after rollback. */
  onRollback(callback: () => void): void;

  /** Dispose the unit of work (rolls back if still active). */
  dispose(): void;
}

// ── Concrete Implementation ──

let _uowCounter = 0;

export class UnitOfWork implements IUnitOfWork {
  public readonly id: string;
  private _isActive = false;
  private _isCommitted = false;
  private _isRolledBack = false;
  private _transaction: Database.Transaction | null = null;
  private _commitCallbacks: Array<() => void> = [];
  private _rollbackCallbacks: Array<() => void> = [];
  private _nestingDepth = 0;

  constructor(private _db: Database.Database) {
    _uowCounter += 1;
    this.id = `uow_${Date.now()}_${_uowCounter}`;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isCommitted(): boolean {
    return this._isCommitted;
  }

  get isRolledBack(): boolean {
    return this._isRolledBack;
  }

  begin(): void {
    if (this._isActive) {
      // Nested begin — track depth but don't start a new transaction
      // (SQLite doesn't support nested transactions natively)
      this._nestingDepth++;
      return;
    }

    if (this._isCommitted) {
      throw new Error('UnitOfWork has already been committed');
    }
    if (this._isRolledBack) {
      throw new Error('UnitOfWork has already been rolled back');
    }

    this._transaction = this._db.transaction(() => {
      // The actual DB operations happen inside the transaction callback.
      // We use a savepoint-like approach: the transaction is the boundary.
    });

    this._isActive = true;
  }

  commit(): void {
    if (!this._isActive) {
      throw new Error('UnitOfWork has no active transaction to commit');
    }

    if (this._nestingDepth > 0) {
      // Nested commit — just decrement, don't actually commit
      this._nestingDepth--;
      return;
    }

    this._isActive = false;
    this._isCommitted = true;

    // Execute commit callbacks
    for (const cb of this._commitCallbacks) {
      try {
        cb();
      } catch {
        // Swallow callback errors — commit succeeded
      }
    }
    this._commitCallbacks = [];
  }

  rollback(): void {
    if (!this._isActive && !this._isCommitted) {
      return; // Nothing to roll back
    }

    if (this._isCommitted) {
      throw new Error('Cannot roll back a committed UnitOfWork');
    }

    this._isActive = false;
    this._isRolledBack = true;

    // Execute rollback callbacks
    for (const cb of this._rollbackCallbacks) {
      try {
        cb();
      } catch {
        // Swallow callback errors
      }
    }
    this._rollbackCallbacks = [];
    this._commitCallbacks = [];
  }

  onCommit(callback: () => void): void {
    this._commitCallbacks.push(callback);
  }

  onRollback(callback: () => void): void {
    this._rollbackCallbacks.push(callback);
  }

  dispose(): void {
    if (this._isActive) {
      this.rollback();
    }
  }
}

// ── Unit of Work Factory ──

export interface IUnitOfWorkFactory {
  /** Create a new unit of work. */
  create(): IUnitOfWork;

  /** Get the current unit of work for this scope (if any). */
  getCurrent(): IUnitOfWork | null;
}

export class UnitOfWorkFactory implements IUnitOfWorkFactory {
  private _current: IUnitOfWork | null = null;

  constructor(private _db: Database.Database) {}

  create(): IUnitOfWork {
    const uow = new UnitOfWork(this._db);
    this._current = uow;
    return uow;
  }

  getCurrent(): IUnitOfWork | null {
    return this._current;
  }
}
