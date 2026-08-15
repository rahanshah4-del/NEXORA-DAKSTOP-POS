/**
 * ValidationMiddleware.ts — Validates commands before they reach handlers.
 *
 * Priority: 100 (first in pipeline).
 * Uses Zod-like validation patterns. Extensible for custom validators.
 */

import type { IMiddleware, PipelineDelegate } from '../common/ApplicationPipeline';
import type { IApplicationContext } from '../common/ApplicationContext';
import type { Result } from '../common/Result';
import { ErrorCode } from '../common/Result';
import { MiddlewarePriority } from '../common/ApplicationPipeline';

// ── Validation Rule ──

export type ValidationRule<T> = (
  command: T,
  context: IApplicationContext,
) => { field: string; code: string; message: string } | null;

// ── Validator Registry ──

export class CommandValidatorRegistry {
  private _rules = new Map<string, ValidationRule<unknown>[]>();

  /** Register validation rules for a command type. */
  register<T>(commandType: string, rules: ValidationRule<T>[]): this {
    this._rules.set(commandType, rules as ValidationRule<unknown>[]);
    return this;
  }

  /** Get rules for a command type. */
  get(commandType: string): ValidationRule<unknown>[] {
    return this._rules.get(commandType) ?? [];
  }

  /** Check if rules exist for a command type. */
  has(commandType: string): boolean {
    return this._rules.has(commandType);
  }
}

// ── Middleware ──

export class ValidationMiddleware implements IMiddleware {
  public readonly name = 'Validation';
  public readonly priority = MiddlewarePriority.Validation;

  constructor(private _validatorRegistry: CommandValidatorRegistry) {}

  async invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>> {
    // Only validate commands (not queries) for now
    // Query validation can be added similarly
    if (!commandOrQuery || typeof commandOrQuery !== 'object') {
      return next();
    }

    // Try to get command type from constructor name or explicit property
    const cmdObj = commandOrQuery as Record<string, unknown>;
    const commandType =
      (cmdObj['__commandType'] as string) ??
      (commandOrQuery as object).constructor?.name;

    if (!commandType) {
      // No identifiable command type — skip validation
      return next();
    }

    const rules = this._validatorRegistry.get(commandType);
    if (rules.length === 0) {
      return next();
    }

    // Run all rules
    const errors: Array<{ field: string; code: string; message: string }> = [];
    for (const rule of rules) {
      const error = rule(commandOrQuery, context);
      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      const Result = require('../common/Result').Result;
      return Result.validationFail(errors);
    }

    return next();
  }
}
