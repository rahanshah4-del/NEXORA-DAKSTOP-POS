import { z } from 'zod';

// Auth
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Product
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  priceCents: z.number().min(0, 'Price must be positive'),
  costCents: z.number().min(0),
  taxRateBps: z.number().min(0),
});

export type ProductInput = z.infer<typeof productSchema>;

// Customer
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone must be at least 10 digits').optional().or(z.literal('')),
  address: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// Employee
export const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string(),
  hourlyRateCents: z.number().min(0).optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

// Generic
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[+]?[\d\s()-]{10,15}$/.test(phone);
}
