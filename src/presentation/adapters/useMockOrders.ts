/**
 * useMockOrders.ts — Order hook backed by local React state + menu store.
 *
 * Orders exist in-memory only (no persistence). Uses menu store for product lookup.
 */

import { useState, useCallback, useMemo } from 'react';
import { useMenuStore } from '@/stores/menu-store';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { OrderViewModel, type OrderViewData } from '../viewModels/OrderViewModel';

let _orderCounter = 100;

interface MockOrder {
  id: string; orderNumber: number; tableId: string | null; tableName: string | null;
  customerId: string | null; customerName: string | null; orderType: string;
  status: string; subtotalCents: number; taxCents: number; discountCents: number; totalCents: number;
  paymentStatus: string; paymentMethod: string | null; notes: string | null;
  items: MockOrderItem[]; createdBy: string; createdAt: string; updatedAt: string;
}
interface MockOrderItem {
  id: string; orderId: string; productId: string; name: string; quantity: number;
  unitPriceCents: number; totalPriceCents: number; notes: string | null; status: string; createdAt: string;
}

export function useMockOrders() {
  const menuStore = useMenuStore();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeOrders = useMemo(() =>
    OrderViewModel.toViewDataList(orders.filter(o => !['completed', 'cancelled'].includes(o.status)) as any),
  [orders]);

  const createOrder = useCallback(async (input: any) => {
    try {
      setIsLoading(true);
      const now = new Date().toISOString();
      const orderNumber = ++_orderCounter;

      const items: MockOrderItem[] = (input.items ?? []).map((item: any) => {
        const product = menuStore.items.find(p => p.id === item.productId);
        const priceCents = product ? Math.round(product.price * 100) : 0;
        return {
          id: `oi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          orderId: '', productId: item.productId, name: product?.name ?? 'Unknown',
          quantity: item.quantity ?? 1, unitPriceCents: priceCents,
          totalPriceCents: priceCents * (item.quantity ?? 1),
          notes: item.notes ?? null, status: 'pending', createdAt: now,
        };
      });

      const subtotal = items.reduce((s: number, i: MockOrderItem) => s + i.totalPriceCents, 0);
      const tax = Math.round(subtotal * 0.05);

      const order: MockOrder = {
        id: `ord_${Date.now()}`,
        orderNumber, tableId: input.tableId ?? null, tableName: input.tableId ? `Table ${input.tableId}` : null,
        customerId: input.customerId ?? null, customerName: null,
        orderType: input.orderType ?? 'dine_in',
        status: 'pending', subtotalCents: subtotal, taxCents: tax, discountCents: 0,
        totalCents: subtotal + tax, paymentStatus: 'unpaid', paymentMethod: null,
        notes: input.notes ?? null, items, createdBy: input.createdBy ?? 'user-1',
        createdAt: now, updatedAt: now,
      };
      items.forEach(i => i.orderId = order.id);

      setOrders(prev => [order, ...prev]);
      notifySuccess('Order Created', `Order #${orderNumber} placed`);
      return { success: true, data: order, error: null };
    } catch (err: any) {
      setError(err.message);
      notifyError(err.message);
      return { success: false, data: null, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [menuStore]);

  const addItem = useCallback(async (orderId: string, productId: string, quantity: number, notes?: string) => {
    const product = menuStore.items.find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found' };
    const priceCents = Math.round(product.price * 100);
    const item: MockOrderItem = {
      id: `oi_${Date.now()}`, orderId, productId, name: product.name, quantity,
      unitPriceCents: priceCents, totalPriceCents: priceCents * quantity,
      notes: notes ?? null, status: 'pending', createdAt: new Date().toISOString(),
    };
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, items: [...o.items, item] } : o));
    return { success: true, data: item, error: null };
  }, [menuStore]);

  const removeItem = useCallback(async (orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, items: o.items.filter(i => i.id !== itemId) } : o));
    return { success: true, error: null };
  }, []);

  const refetchOrders = useCallback(async () => { /* local state, no-op */ }, []);

  return {
    activeOrders, orders,
    createOrder, addItem, removeItem,
    updateOrder: async () => ({ success: true }),
    cancelOrder: async () => { notifySuccess('Cancelled', 'Order cancelled'); return { success: true }; },
    updatePaymentStatus: async () => ({ success: true }),
    isCreating: isLoading, isLoadingOrders: false,
    createError: error, ordersError: error,
    refetchOrders,
  };
}
