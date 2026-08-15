/**
 * validation.ts — Form validation rules and helpers.
 *
 * Lightweight, framework-agnostic validation.
 * Rules return null if valid, or an error object if invalid.
 */

// ── Types ──

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export type ValidationRule<T = unknown> = (
  value: T,
  allValues?: Record<string, unknown>,
) => ValidationError | null;

export interface ValidationSchema<T extends Record<string, unknown>> {
  [K in keyof T]?: ValidationRule<T[K]>[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
}

// ── Built-in Rules ──

/** Value is required (non-empty string, non-null, non-undefined). */
export function required(field: string, message?: string): ValidationRule {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return { field, code: 'required', message: message ?? `${field} is required` };
    }
    return null;
  };
}

/** Value must be at least `min` characters. */
export function minLength(field: string, min: number): ValidationRule<string> {
  return (value: string) => {
    if (value && value.length < min) {
      return { field, code: 'minLength', message: `${field} must be at least ${min} characters` };
    }
    return null;
  };
}

/** Value must not exceed `max` characters. */
export function maxLength(field: string, max: number): ValidationRule<string> {
  return (value: string) => {
    if (value && value.length > max) {
      return { field, code: 'maxLength', message: `${field} must not exceed ${max} characters` };
    }
    return null;
  };
}

/** Value must be a positive number. */
export function positiveNumber(field: string): ValidationRule<number> {
  return (value: number) => {
    if (value !== undefined && value !== null && value <= 0) {
      return { field, code: 'positive', message: `${field} must be positive` };
    }
    return null;
  };
}

/** Value must be a valid email. */
export function email(field: string): ValidationRule<string> {
  return (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { field, code: 'email', message: `${field} must be a valid email` };
    }
    return null;
  };
}

/** Value must match a regex pattern. */
export function pattern(
  field: string,
  regex: RegExp,
  message: string,
): ValidationRule<string> {
  return (value: string) => {
    if (value && !regex.test(value)) {
      return { field, code: 'pattern', message };
    }
    return null;
  };
}

/** Value must be one of the allowed options. */
export function oneOf<T>(field: string, options: T[]): ValidationRule<T> {
  return (value: T) => {
    if (value !== undefined && value !== null && !options.includes(value)) {
      return { field, code: 'oneOf', message: `${field} must be one of: ${options.join(', ')}` };
    }
    return null;
  };
}

// ── Schema Validator ──

/**
 * Validate an object against a schema of rules.
 * Returns a ValidationResult with all errors.
 */
export function validate<T extends Record<string, unknown>>(
  values: T,
  schema: ValidationSchema<T>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const fieldErrors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    if (!rules || !Array.isArray(rules)) continue;
    const value = values[field];

    for (const rule of rules) {
      const error = rule(value, values);
      if (error) {
        errors.push(error);
        if (!fieldErrors[field]) {
          fieldErrors[field] = error.message;
        }
        break; // Stop at first error per field
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * Validate a single value against rules.
 */
export function validateField<T>(
  field: string,
  value: T,
  rules: ValidationRule<T>[],
): ValidationError | null {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

// ── Common Schemas ──

export const ORDER_SCHEMA: ValidationSchema<Record<string, unknown>> = {
  items: [
    (value: unknown) => {
      const arr = value as unknown[];
      if (!arr || arr.length === 0) {
        return { field: 'items', code: 'required', message: 'Order must have at least one item' };
      }
      return null;
    },
  ],
};

export const PRODUCT_SCHEMA: ValidationSchema<Record<string, unknown>> = {
  name: [required('Product name')],
  priceCents: [positiveNumber('Price')],
};

export const CUSTOMER_SCHEMA: ValidationSchema<Record<string, unknown>> = {
  name: [required('Customer name')],
  email: [email('Email')],
};

export const TABLE_SCHEMA: ValidationSchema<Record<string, unknown>> = {
  name: [required('Table name')],
  capacity: [positiveNumber('Capacity')],
};

export const EMPLOYEE_SCHEMA: ValidationSchema<Record<string, unknown>> = {
  firstName: [required('First name')],
  lastName: [required('Last name')],
};
