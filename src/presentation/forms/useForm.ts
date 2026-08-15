/**
 * useForm.ts — Generic form state management hook.
 *
 * Manages form values, touched state, validation, submission.
 *
 * Usage:
 *   const form = useForm({ name: '', email: '' }, CUSTOMER_SCHEMA);
 *   form.setValue('name', 'Alice');
 *   const result = await form.handleSubmit(async (values) => { ... });
 */

import { useState, useCallback, useMemo } from 'react';
import {
  validate,
  type ValidationSchema,
  type ValidationResult,
} from './validation';

// ── Types ──

export interface UseFormReturn<T extends Record<string, unknown>> {
  /** Current form values. */
  values: T;

  /** Field-level error messages. */
  errors: Record<string, string>;

  /** Which fields have been touched. */
  touched: Record<string, boolean>;

  /** Whether the form is currently submitting. */
  isSubmitting: boolean;

  /** Overall validation result. */
  validationResult: ValidationResult;

  /** Set a single field value. */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;

  /** Set multiple field values at once. */
  setValues: (partial: Partial<T>) => void;

  /** Mark a field as touched. */
  setTouched: (field: keyof T) => void;

  /** Validate all fields. Returns true if valid. */
  validate: () => boolean;

  /** Handle form submission. Runs validation, then calls onSubmit if valid. */
  handleSubmit: (onSubmit: (values: T) => Promise<void> | void) => Promise<boolean>;

  /** Reset form to initial state. */
  reset: (newValues?: T) => void;
}

// ── Hook ──

export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  schema?: ValidationSchema<T>,
): UseFormReturn<T> {
  const [values, setValuesState] = useState<T>({ ...initialValues });
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationResult = useMemo(() => {
    if (!schema) {
      return { valid: true, errors: [], fieldErrors: {} };
    }
    return validate(values, schema);
  }, [values, schema]);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [field]: value }));
    setTouchedState((prev) => ({ ...prev, [field as string]: true }));
  }, []);

  const setValues = useCallback((partial: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setTouched = useCallback((field: keyof T) => {
    setTouchedState((prev) => ({ ...prev, [field as string]: true }));
  }, []);

  const validateForm = useCallback((): boolean => {
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(values)) {
      allTouched[key] = true;
    }
    setTouchedState(allTouched);
    return validationResult.valid;
  }, [values, validationResult]);

  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => Promise<void> | void): Promise<boolean> => {
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(values)) {
        allTouched[key] = true;
      }
      setTouchedState(allTouched);

      if (!validationResult.valid) {
        return false;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
        return true;
      } catch {
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validationResult],
  );

  const reset = useCallback(
    (newValues?: T) => {
      setValuesState(newValues ? { ...newValues } : { ...initialValues });
      setTouchedState({});
      setIsSubmitting(false);
    },
    [initialValues],
  );

  return {
    values,
    errors: validationResult.fieldErrors,
    touched,
    isSubmitting,
    validationResult,
    setValue,
    setValues,
    setTouched,
    validate: validateForm,
    handleSubmit,
    reset,
  };
}
