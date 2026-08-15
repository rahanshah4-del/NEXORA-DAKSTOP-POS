/**
 * orderForm.ts — Order-specific form helpers and presets.
 */

import { useForm } from './useForm';
import { ORDER_SCHEMA } from './validation';
import type { CreateOrderItemInput } from '../../services/restaurant/order-service';

// ── Types ──

export interface OrderFormValues {
  tableId: string;
  customerId: string;
  orderType: string;
  items: CreateOrderItemInput[];
  notes: string;
}

// ── Default Values ──

export const DEFAULT_ORDER_VALUES: OrderFormValues = {
  tableId: '',
  customerId: '',
  orderType: 'dine_in',
  items: [],
  notes: '',
};

// ── Hook ──

/**
 * Pre-configured form hook for order creation.
 */
export function useOrderForm() {
  return useForm<OrderFormValues>(DEFAULT_ORDER_VALUES, ORDER_SCHEMA);
}

// ── Item Helpers ──

/**
 * Add an item to the order form's items array.
 */
export function addItemToOrder(
  values: OrderFormValues,
  productId: string,
  quantity: number = 1,
  notes?: string,
): OrderFormValues {
  const existingIndex = values.items.findIndex((i) => i.productId === productId);

  if (existingIndex >= 0) {
    const updated = [...values.items];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + quantity,
    };
    return { ...values, items: updated };
  }

  return {
    ...values,
    items: [
      ...values.items,
      { productId, quantity, notes: notes ?? null },
    ],
  };
}

/**
 * Remove an item from the order form's items array.
 */
export function removeItemFromOrder(
  values: OrderFormValues,
  productId: string,
): OrderFormValues {
  return {
    ...values,
    items: values.items.filter((i) => i.productId !== productId),
  };
}

/**
 * Update an item's quantity.
 */
export function updateItemQuantity(
  values: OrderFormValues,
  productId: string,
  quantity: number,
): OrderFormValues {
  return {
    ...values,
    items: values.items.map((i) =>
      i.productId === productId ? { ...i, quantity } : i,
    ),
  };
}

/**
 * Calculate the total number of items in the order.
 */
export function totalItemCount(values: OrderFormValues): number {
  return values.items.reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Check if the order has any items.
 */
export function hasItems(values: OrderFormValues): boolean {
  return values.items.length > 0;
}
