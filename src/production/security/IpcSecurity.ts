/**
 * IpcSecurity — IPC payload validation and security hardening.
 *
 * Validates: command shapes, query shapes, prevents malformed requests.
 * All SQL uses parameterized queries (enforced at repository layer).
 */

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
}

export function validateIpcPayload(
  payload: unknown,
  rules: ValidationRule[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Payload must be an object'] };
  }

  const data = payload as Record<string, unknown>;

  for (const rule of rules) {
    const value = data[rule.field];

    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Field '${rule.field}' is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`Field '${rule.field}' must be a string`);
    } else if (rule.type === 'number' && typeof value !== 'number') {
      errors.push(`Field '${rule.field}' must be a number`);
    } else if (rule.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Field '${rule.field}' must be a boolean`);
    } else if (rule.type === 'array' && !Array.isArray(value)) {
      errors.push(`Field '${rule.field}' must be an array`);
    }

    if (rule.min !== undefined && typeof value === 'string' && (value as string).length < rule.min) {
      errors.push(`Field '${rule.field}' must be at least ${rule.min} characters`);
    }
    if (rule.max !== undefined && typeof value === 'string' && (value as string).length > rule.max) {
      errors.push(`Field '${rule.field}' must be at most ${rule.max} characters`);
    }
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value as string)) {
      errors.push(`Field '${rule.field}' format is invalid`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Pre-built validation rules for common IPC payloads
export const IPC_VALIDATION_RULES: Record<string, ValidationRule[]> = {
  'orders:create': [
    { field: 'items', type: 'array', required: true },
    { field: 'createdBy', type: 'string', required: true },
  ],
  'orders:cancel': [
    { field: 'orderId', type: 'string', required: true, min: 1 },
  ],
  'products:create': [
    { field: 'name', type: 'string', required: true, min: 1, max: 200 },
    { field: 'priceCents', type: 'number', required: true },
  ],
  'payments:process': [
    { field: 'orderId', type: 'string', required: true },
    { field: 'amountCents', type: 'number', required: true },
    { field: 'method', type: 'string', required: true },
  ],
  'staff:clockIn': [
    { field: 'employeeId', type: 'string', required: true },
  ],
  'settings:set': [
    { field: 'key', type: 'string', required: true, min: 1, max: 200 },
    { field: 'value', type: 'string', required: true },
  ],
};
