/**
 * useReservations — Firestore-backed reservation operations.
 *
 * Wraps window.api.firestore.reservations.* with loading/error state.
 * Reads workspaceId from the auth store (populated by staffPinLogin).
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { userFriendlyError } from '@/utils/error-helper';

// ── Types (mirrors src/firebase/firestore-pos.ts) ──

export interface PosReservation {
  id?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  partySize: number;
  date: string;
  time: string;
  tableId?: string;
  tableName?: string;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no-show';
  notes?: string;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseReservationsReturn {
  /** Current list of reservations. */
  reservations: PosReservation[];
  /** True while any operation is in-flight. */
  isLoading: boolean;
  /** Non-null when the last operation failed. */
  error: string | null;

  /** Create a new reservation. Returns the new reservation id. */
  createReservation: (data: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    partySize: number;
    date: string;
    time: string;
    tableId?: string;
    tableName?: string;
    notes?: string;
  }) => Promise<string | null>;
  /** Fetch reservations, optionally filtered by date/status. */
  fetchReservations: (filters?: {
    date?: string;
    status?: string;
    limit?: number;
  }) => Promise<void>;
  /** Update reservation fields. */
  updateReservation: (
    reservationId: string,
    updates: Partial<
      Pick<
        PosReservation,
        'customerName' | 'customerPhone' | 'customerEmail' | 'partySize' | 'time' | 'date' | 'status' | 'notes' | 'tableId' | 'tableName'
      >
    >,
  ) => Promise<boolean>;
  /** Cancel a reservation. */
  cancelReservation: (reservationId: string) => Promise<boolean>;

  /** Clear any error. */
  clearError: () => void;
}

export function useReservations(): UseReservationsReturn {
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const user = useAuthStore((s) => s.user);

  const [reservations, setReservations] = useState<PosReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = staffProfile?.workspaceId ?? '';
  const staffUid = staffProfile?.staffUid ?? user?.uid ?? '';

  const clearError = useCallback(() => setError(null), []);

  // ── Create reservation ──
  const createReservation = useCallback(
    async (data: {
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      partySize: number;
      date: string;
      time: string;
      tableId?: string;
      tableName?: string;
      notes?: string;
    }): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.reservations.create(
          workspaceId,
          {
            customerName: data.customerName,
            customerPhone: data.customerPhone ?? '',
            customerEmail: data.customerEmail ?? '',
            partySize: data.partySize,
            date: data.date,
            time: data.time,
            status: 'confirmed',
            tableId: data.tableId ?? '',
            tableName: data.tableName ?? '',
            notes: data.notes ?? '',
            createdBy: staffUid,
          },
        );
        if (!result.success)
          throw new Error(result.error ?? 'Failed to create reservation');
        return result.id ?? null;
      } catch (err: any) {
        setError(userFriendlyError(err, 'creating reservation'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, staffUid],
  );

  // ── Fetch reservations ──
  const fetchReservations = useCallback(
    async (filters?: {
      date?: string;
      status?: string;
      limit?: number;
    }) => {
      if (!workspaceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.api.firestore.reservations.list(
          workspaceId,
          filters ?? {},
        );
        if (result.success) {
          setReservations(result.reservations ?? []);
        } else {
          throw new Error(result.error ?? 'Failed to fetch reservations');
        }
      } catch (err: any) {
        setError(userFriendlyError(err, 'fetching reservations'));
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  // ── Update reservation ──
  const updateReservation = useCallback(
    async (
      reservationId: string,
      updates: Partial<
        Pick<
          PosReservation,
          'customerName' | 'customerPhone' | 'customerEmail' | 'partySize' | 'time' | 'date' | 'status' | 'notes' | 'tableId' | 'tableName'
        >
      >,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.reservations.update(
          workspaceId,
          reservationId,
          updates,
        );
        if (!result.success)
          throw new Error(result.error ?? 'Failed to update reservation');
        return true;
      } catch (err: any) {
        setError(userFriendlyError(err, 'updating reservation'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  // ── Cancel reservation ──
  const cancelReservation = useCallback(
    async (reservationId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.reservations.cancel(
          workspaceId,
          reservationId,
        );
        if (!result.success)
          throw new Error(result.error ?? 'Failed to cancel reservation');
        return true;
      } catch (err: any) {
        setError(userFriendlyError(err, 'cancelling reservation'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  return {
    reservations,
    isLoading,
    error,
    createReservation,
    fetchReservations,
    updateReservation,
    cancelReservation,
    clearError,
  };
}
