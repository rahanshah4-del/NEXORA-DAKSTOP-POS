/**
 * usePayments.ts — Payment-specific hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import type { PaymentRecord } from '../../repositories/IPaymentRepository';

export function usePayments() {
  const processPayment = useCommand<PaymentRecord>('IProcessPaymentCommand');
  const refundPayment = useCommand<PaymentRecord>('IRefundPaymentCommand');
  const voidPayment = useCommand<void>('IVoidPaymentCommand');
  const paymentsQuery = useQuery<PaymentRecord>('IGetPaymentsQuery', { autoFetch: false });
  const paymentSummary = useQuery<Record<string, unknown>>('IGetPaymentSummaryQuery', { autoFetch: false });

  const process = useCallback(async (input: Record<string, unknown>) => {
    const result = await processPayment.execute(input);
    if (result.isSuccess) notifySuccess('Payment Processed', '');
    else notifyError('Payment Failed', result.error ?? '');
    return result;
  }, [processPayment]);

  return {
    processPayment: process, refundPayment: refundPayment.execute,
    voidPayment: voidPayment.execute,
    isProcessing: processPayment.isLoading, paymentError: processPayment.error,
    payments: (paymentsQuery.data?.items ?? []) as PaymentRecord[],
    isLoading: paymentsQuery.isLoading,
    fetchPayments: (orderId?: string) => paymentsQuery.refetch({ orderId }),
    paymentSummary: paymentSummary.data?.items?.[0] ?? null,
  };
}
