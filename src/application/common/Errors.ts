/**
 * Errors.ts — Domain-specific exception classes for the application layer.
 *
 * These are thrown ONLY for infrastructure / truly unexpected failures.
 * Expected business failures use Result.fail() instead of throwing.
 */

import { ErrorCode } from './Result';

// ── Base Application Error ──

export abstract class ApplicationError extends Error {
  public abstract readonly code: ErrorCode;

  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Concrete Error Types ──

export class ValidationException extends ApplicationError {
  public readonly code = ErrorCode.ValidationFailed;
  public readonly errors: Array<{ field: string; code: string; message: string }>;

  constructor(
    message: string,
    errors: Array<{ field: string; code: string; message: string }> = [],
  ) {
    super(message);
    this.errors = errors;
  }
}

export class AuthorizationException extends ApplicationError {
  public readonly code = ErrorCode.Forbidden;

  constructor(message = 'Insufficient permissions') {
    super(message);
  }
}

export class NotFoundException extends ApplicationError {
  public readonly code = ErrorCode.NotFound;

  constructor(entity: string, id: string) {
    super(`${entity} with id '${id}' not found`);
  }
}

export class ConflictException extends ApplicationError {
  public readonly code = ErrorCode.Conflict;

  constructor(message: string) {
    super(message);
  }
}

export class BusinessRuleException extends ApplicationError {
  public readonly code = ErrorCode.BusinessRuleViolation;

  constructor(message: string) {
    super(message);
  }
}

export class InfrastructureException extends ApplicationError {
  public readonly code = ErrorCode.Internal;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

export class DatabaseException extends ApplicationError {
  public readonly code = ErrorCode.DatabaseError;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

export class VersionMismatchException extends ApplicationError {
  public readonly code = ErrorCode.VersionMismatch;

  constructor(entity: string, id: string, expectedVersion: number, actualVersion: number) {
    super(
      `${entity} '${id}' version mismatch: expected ${expectedVersion}, got ${actualVersion}`,
    );
  }
}

export class InvalidStateTransitionException extends ApplicationError {
  public readonly code = ErrorCode.InvalidStateTransition;

  constructor(entity: string, id: string, from: string, to: string) {
    super(`Invalid state transition for ${entity} '${id}': '${from}' → '${to}'`);
  }
}

export class InsufficientStockException extends ApplicationError {
  public readonly code = ErrorCode.InsufficientStock;

  constructor(itemId: string, requested: number, available: number) {
    super(`Insufficient stock for '${itemId}': requested ${requested}, available ${available}`);
  }
}
