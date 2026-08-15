/**
 * IValidationResult — validation outcome contract.
 * Interface only. No implementation.
 */

export interface IValidationResult {
  /** Whether validation passed */
  readonly isValid: boolean;

  /** List of validation errors */
  readonly errors: IValidationError[];

  /** List of validation warnings (non-blocking) */
  readonly warnings: IValidationWarning[];

  /** Add an error to the result */
  addError(field: string, code: string, message: string): IValidationResult;

  /** Add a warning to the result */
  addWarning(field: string, code: string, message: string): IValidationResult;

  /** Merge another validation result into this one */
  merge(other: IValidationResult): IValidationResult;

  /** Get all messages (errors + warnings) */
  getAllMessages(): string[];

  /** Get error messages only */
  getErrorMessages(): string[];

  /** Get warning messages only */
  getWarningMessages(): string[];
}

export interface IValidationError {
  field: string;
  code: string;
  message: string;
}

export interface IValidationWarning {
  field: string;
  code: string;
  message: string;
}

export type ValidationRules<T> = {
  [K in keyof T]?: IValidationRule<T[K]>[];
};

export interface IValidationRule<TValue> {
  name: string;
  validate(value: TValue, context?: Record<string, unknown>): boolean;
  message(value: TValue): string;
}

export const ValidationResult = {
  success(): IValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      addError(field, code, message) {
        this.errors.push({ field, code, message });
        (this as { isValid: boolean }).isValid = false;
        return this;
      },
      addWarning(field, code, message) {
        this.warnings.push({ field, code, message });
        return this;
      },
      merge(other) {
        this.errors.push(...other.errors);
        this.warnings.push(...other.warnings);
        if (other.errors.length > 0) (this as { isValid: boolean }).isValid = false;
        return this;
      },
      getAllMessages() {
        return [
          ...this.errors.map((e) => e.message),
          ...this.warnings.map((w) => w.message),
        ];
      },
      getErrorMessages() {
        return this.errors.map((e) => e.message);
      },
      getWarningMessages() {
        return this.warnings.map((w) => w.message);
      },
    };
  },
};
