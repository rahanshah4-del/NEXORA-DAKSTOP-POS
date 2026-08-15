/**
 * useOrders.ts — Order-specific hooks composing useCommand/useQuery with ViewModels.
 * Phase 16: Connected to real backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess, notifyError, notifyInfo } from '@/stores/toast-store';
import { OrderViewModel, type OrderViewData } from '../viewModels/OrderViewModel';
import type { Order, OrderItem } from '../../types/models';

export function useOrders() {
  const createOrder = useCommand<Order>('ICreateOrderCommand');
  const updateOrder = useCommand<Order>('IUpdateOrderCommand');
  const cancelOrderCmd = useCommand<void>('ICancelOrderCommand');
  const addItemCmd = useCommand<OrderItem>('IAddOrderItemCommand');
  const removeItemCmd = useCommand<void>('IRemoveOrderItemCommand');
  const updatePaymentStatus = useCommand<void>('IUpdatePaymentStatusCommand');

  const activeOrders = useQuery<Order>('IGetActiveOrdersQuery', { autoFetch: false });

  const fetchActiveOrders = useCallback(async () => activeOrders.refetch(), [activeOrders]);

  const createNewOrder = useCallback(async (input: Record<string, unknown>) => {
    const result = await createOrder.execute(input);
    if (result.isSuccess) {
      notifySuccess('Order Created', `Order #${(result.value as any)?.orderNumber ?? '?'} has been placed`);
      await fetchActiveOrders();
    } else notifyError('Order Failed', result.error ?? 'Could not create order');
    return { success: result.isSuccess, data: result.value, error: result.error };
  }, [createOrder, fetchActiveOrders]);

  const cancelExistingOrder = useCallback(async (orderId: string, reason?: string) => {
    const result = await cancelOrderCmd.execute({ orderId, reason });
    if (result.isSuccess) { notifyInfo('Order Cancelled', ''); await fetchActiveOrders(); }
    return { success: result.isSuccess, data: result.value, error: result.error };
  }, [cancelOrderCmd, fetchActiveOrders]);

  const activeOrderViews = OrderViewModel.toViewDataList((activeOrders.data?.items as Order[]) ?? []);

  return {
    createOrder: createNewOrder, updateOrder: updateOrder.execute,
    cancelOrder: cancelExistingOrder, addItem: addItemCmd.execute,
    removeItem: removeItemCmd.execute, updatePaymentStatus: updatePaymentStatus.execute,
    isCreating: createOrder.isLoading, isUpdating: updateOrder.isLoading,
    createError: createOrder.error, activeOrders: activeOrderViews,
    isLoadingOrders: activeOrders.isLoading, ordersError: activeOrders.error,
    refetchOrders: fetchActiveOrders,
  };
}
