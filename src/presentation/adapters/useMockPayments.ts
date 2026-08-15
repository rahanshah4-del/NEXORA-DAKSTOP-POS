/**
 * useMockPayments.ts — Payment hook backed by local React state.
 */

import { useState, useCallback } from 'react';
import { notifySuccess, notifyError } from '@/stores/toast-store';

export function useMockPayments() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processPayment = useCallback(async (input: any) => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 500));
    setIsProcessing(false);
    const amount = (input.amountCents / 100).toFixed(2);
    notifySuccess('Payment Received', `₹${amount} via ${input.method}`);
    return { success: true, data: { id: `pay_${Date.now()}`, ...input }, error: null };
  }, []);

  const refundPayment = useCallback(async () => {
    notifySuccess('Refund Processed', 'Payment has been refunded');
    return { success: true };
  }, []);

  return {
    processPayment, refundPayment,
    voidPayment: async () => ({ success: true }),
    isProcessing, paymentError: null,
    payments: [], fetchPayments: async () => {},
    paymentSummary: null,
  };
}
