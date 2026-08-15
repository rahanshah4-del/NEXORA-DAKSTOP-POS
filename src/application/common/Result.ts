/**
 * Result.ts — Discriminated result wrapper for all application-layer operations.
 *
 * Every command and query handler returns Result<T>, never throws for
 * expected failure modes. Only infrastructure failures throw.
 *
 * Pattern: Rust-style Result with Success / Failure variants.
 */

// ── Validation ──

export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export interface ValidationWarning {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

// ── Error Codes ──

export enum ErrorCode {
  // Generic
  Unknown = 'UNKNOWN',
  Internal = 'INTERNAL_ERROR',

  // Validation
  ValidationFailed = 'VALIDATION_FAILED',
  InvalidInput = 'INVALID_INPUT',

  // Authorization
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',

  // Entity
  NotFound = 'NOT_FOUND',
  AlreadyExists = 'ALREADY_EXISTS',
  Conflict = 'CONFLICT',
  VersionMismatch = 'VERSION_MISMATCH',

  // Business Rules
  BusinessRuleViolation = 'BUSINESS_RULE_VIOLATION',
  InvalidStateTransition = 'INVALID_STATE_TRANSITION',
  OperationNotAllowed = 'OPERATION_NOT_ALLOWED',

  // Infrastructure
  DatabaseError = 'DATABASE_ERROR',
  NetworkError = 'NETWORK_ERROR',
  Timeout = 'TIMEOUT',
  SyncFailed = 'SYNC_FAILED',

  // Payment
  PaymentFailed = 'PAYMENT_FAILED',
  RefundFailed = 'REFUND_FAILED',

  // Inventory
  InsufficientStock = 'INSUFFICIENT_STOCK',

  // Staff
  AlreadyClockedIn = 'ALREADY_CLOCKED_IN',
  NotClockedIn = 'NOT_CLOCKED_IN',
  ShiftAlreadyClosed = 'SHIFT_ALREADY_CLOSED',
}

// ── Result Type ──

export class Result<T = void> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value: T | null,
    public readonly error: string | null,
    public readonly errorCode: ErrorCode | null,
    public readonly validationErrors: ValidationError[],
    public readonly warnings: ValidationWarning[],
    public readonly exception: Error | null,
  ) {}

  // ── Factory Methods ──

  /** Create a successful result with a value. */
  static ok<T>(value: T, warnings: ValidationWarning[] = []): Result<T> {
    return new Result<T>(true, value, null, null, [], warnings, null);
  }

  /** Create a successful result with no value (void). */
  static success(warnings: ValidationWarning[] = []): Result<void> {
    return new Result<void>(true, null, null, null, [], warnings, null);
  }

  /** Create a failed result. */
  static fail<T = void>(
    error: string,
    errorCode: ErrorCode = ErrorCode.Unknown,
    validationErrors: ValidationError[] = [],
    exception: Error | null = null,
  ): Result<T> {
    return new Result<T>(false, null, error, errorCode, validationErrors, [], exception);
  }

  /** Create a failed result from validation errors. */
  static validationFail<T = void>(
    errors: ValidationError[],
    warnings: ValidationWarning[] = [],
  ): Result<T> {
    const message = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    return new Result<T>(false, null, message, ErrorCode.ValidationFailed, errors, warnings, null);
  }

  /** Create a "not found" result. */
  static notFound<T = void>(entity: string, id: string): Result<T> {
    return Result.fail<T>(
      `${entity} with id '${id}' not found`,
      ErrorCode.NotFound,
    );
  }

  /** Create a "forbidden" result. */
  static forbidden<T = void>(reason = 'Insufficient permissions'): Result<T> {
    return Result.fail<T>(reason, ErrorCode.Forbidden);
  }

  /** Create an "unauthorized" result. */
  static unauthorized<T = void>(): Result<T> {
    return Result.fail<T>('Authentication required', ErrorCode.Unauthorized);
  }

  /** Create a conflict result. */
  static conflict<T = void>(message: string): Result<T> {
    return Result.fail<T>(message, ErrorCode.Conflict);
  }

  /** Create a business rule violation result. */
  static businessRuleViolation<T = void>(message: string): Result<T> {
    return Result.fail<T>(message, ErrorCode.BusinessRuleViolation);
  }

  // ── Query Helpers ──

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  /** Throw if this is a failure result (use only when failure is truly unexpected). */
  getOrThrow(): T {
    if (!this.isSuccess) {
      throw this.exception ?? new Error(this.error ?? 'Unknown error');
    }
    return this.value as T;
  }

  /** Get the value or a default. */
  getValueOrDefault(defaultValue: T): T {
    return this.isSuccess ? (this.value as T) : defaultValue;
  }

  /** Map the success value through a transform. */
  map<U>(fn: (value: T) => U): Result<U> {
    if (!this.isSuccess) {
      return new Result<U>(false, null, this.error, this.errorCode, this.validationErrors, this.warnings, this.exception);
    }
    try {
      return Result.ok(fn(this.value as T), this.warnings);
    } catch (err) {
      return Result.fail<U>(
        (err as Error).message,
        ErrorCode.Internal,
        [],
        err as Error,
      );
    }
  }

  /** Chain another result-producing operation. */
  async then<U>(fn: (value: T) => Promise<Result<U>>): Promise<Result<U>> {
    if (!this.isSuccess) {
      return new Result<U>(false, null, this.error, this.errorCode, this.validationErrors, this.warnings, this.exception);
    }
    try {
      return await fn(this.value as T);
    } catch (err) {
      return Result.fail<U>(
        (err as Error).message,
        ErrorCode.Internal,
        [],
        err as Error,
      );
    }
  }

  /** Add a warning to the result. */
  withWarning(warning: ValidationWarning): this {
    this.warnings.push(warning);
    return this;
  }
}
