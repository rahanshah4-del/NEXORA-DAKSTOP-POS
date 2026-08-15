/**
 * usePayments — Firestore-backed payment operations.
 *
 * Wraps window.api.firestore.payments.* with loading/error state.
 * Reads workspaceId from the auth store (populated by staffPinLogin).
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { userFriendlyError } from '@/utils/error-helper';

// ── Types (mirrors src/firebase/firestore-pos.ts) ──

export interface PosPayment {
  id?: string;
  orderId: string;
  amountCents: number;
  method: string;
  status: string;
  tipCents?: number;
  reference?: string;
  notes?: string;
  processedBy: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UsePaymentsReturn {
  /** List of payments matching current filters. */
  payments: PosPayment[];
  /** True while any operation is in-flight. */
  isLoading: boolean;
  /** Non-null when the last operation failed. */
  error: string | null;

  /** Record a new payment against an order. Returns the new payment id. */
  recordPayment: (data: {
    orderId: string;
    amountCents: number;
    method: string;
    tipCents?: number;
    reference?: string;
    notes?: string;
  }) => Promise<string | null>;
  /** Fetch payments, optionally filtered. */
  fetchPayments: (filters?: {
    orderId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<void>;
  /** Update a payment (e.g. refund, void). */
  updatePayment: (
    paymentId: string,
    updates: Partial<Pick<PosPayment, 'status' | 'notes'>>,
  ) => Promise<boolean>;

  /** Clear any error. */
  clearError: () => void;
}

export function usePayments(): UsePaymentsReturn {
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const user = useAuthStore((s) => s.user);

  const [payments, setPayments] = useState<PosPayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = staffProfile?.workspaceId ?? '';
  const staffUid = staffProfile?.staffUid ?? user?.uid ?? '';

  const clearError = useCallback(() => setError(null), []);

  // ── Record payment ──
  const recordPayment = useCallback(
    async (data: {
      orderId: string;
      amountCents: number;
      method: string;
      tipCents?: number;
      reference?: string;
      notes?: string;
    }): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.payments.create(workspaceId, {
          orderId: data.orderId,
          amountCents: data.amountCents,
          method: data.method,
          status: 'paid',
          tipCents: data.tipCents ?? 0,
          reference: data.reference ?? '',
          notes: data.notes ?? '',
          processedBy: staffUid,
        });
        if (!result.success)
          throw new Error(result.error ?? 'Failed to record payment');
        return result.id ?? null;
      } catch (err: any) {
        setError(userFriendlyError(err, 'recording payment'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, staffUid],
  );

  // ── Fetch payments ──
  const fetchPayments = useCallback(
    async (filters?: {
      orderId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) => {
      if (!workspaceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.api.firestore.payments.list(
          workspaceId,
          filters ?? {},
        );
        if (result.success) {
          setPayments(result.payments ?? []);
        } else {
          throw new Error(result.error ?? 'Failed to fetch payments');
        }
      } catch (err: any) {
        setError(userFriendlyError(err, 'fetching payments'));
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  // ── Update payment (refund / void) ──
  const updatePayment = useCallback(
    async (
      paymentId: string,
      updates: Partial<Pick<PosPayment, 'status' | 'notes'>>,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.payments.update(
          workspaceId,
          paymentId,
          updates,
        );
        if (!result.success)
          throw new Error(result.error ?? 'Failed to update payment');
        // Refresh local list
        await fetchPayments();
        return true;
      } catch (err: any) {
        setError(userFriendlyError(err, 'updating payment'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, fetchPayments],
  );

  return {
    payments,
    isLoading,
    error,
    recordPayment,
    fetchPayments,
    updatePayment,
    clearError,
  };
}
