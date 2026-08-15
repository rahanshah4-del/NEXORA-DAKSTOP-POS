/**
 * useCashSessions — Firestore-backed cash session operations.
 *
 * Wraps window.api.firestore.cashSessions.* with loading/error state.
 * Reads workspaceId from the auth store (populated by staffPinLogin).
 */
import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { userFriendlyError } from '@/utils/error-helper';

// ── Types (mirrors src/firebase/firestore-pos.ts) ──

export interface CashSession {
  id?: string;
  openedBy: string;
  openedByName: string;
  openingBalanceCents: number;
  closedBy?: string;
  closedByName?: string;
  closingBalanceCents?: number;
  expectedBalanceCents?: number;
  differenceCents?: number;
  status: 'open' | 'closed';
  notes?: string;
  openedAt?: string;
  closedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseCashSessionsReturn {
  /** Currently active (open) cash session, or null if none is open. */
  activeSession: CashSession | null;
  /** Past cash sessions (history). */
  sessions: CashSession[];
  /** True while any operation is in-flight. */
  isLoading: boolean;
  /** Non-null when the last operation failed. */
  error: string | null;

  /** Open a new cash session. Returns the new session id on success. */
  openSession: (openingBalanceCents: number, notes?: string) => Promise<string | null>;
  /** Close the active cash session. */
  closeSession: (closingData: {
    closingBalanceCents: number;
    expectedBalanceCents: number;
    differenceCents: number;
  }) => Promise<boolean>;
  /** Fetch the currently active cash session. */
  refreshActive: () => Promise<void>;
  /** Fetch cash session history (past sessions). */
  fetchHistory: (filters?: { startDate?: string; endDate?: string; limit?: number }) => Promise<void>;

  /** Clear any error. */
  clearError: () => void;
}

export function useCashSessions(): UseCashSessionsReturn {
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const user = useAuthStore((s) => s.user);

  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = staffProfile?.workspaceId ?? '';
  const staffUid = staffProfile?.staffUid ?? user?.uid ?? '';
  const staffName = staffProfile?.staffName ?? user?.displayName ?? '';

  const clearError = useCallback(() => setError(null), []);

  // ── Fetch active session on mount ──
  useEffect(() => {
    if (!workspaceId || !window.api) return;

    let cancelled = false;
    const fetchActive = async () => {
      try {
        const result = await window.api.firestore.cashSessions.getActive(
          workspaceId,
        );
        if (!cancelled && result.success) {
          setActiveSession(result.session ?? null);
        }
      } catch {
        // Silently ignore — user can manually refresh
      }
    };
    fetchActive();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // ── Open session ──
  const openSession = useCallback(
    async (
      openingBalanceCents: number,
      notes?: string,
    ): Promise<string | null> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.cashSessions.open(
          workspaceId,
          {
            openedBy: staffUid,
            openedByName: staffName,
            openingBalanceCents,
            status: 'open',
            ...(notes ? { notes } : {}),
          },
        );
        if (!result.success) throw new Error(result.error ?? 'Failed to open session');
        // Real-time listener will pick up the new active session
        return result.id ?? null;
      } catch (err: any) {
        setError(userFriendlyError(err, 'opening cash session'));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, staffUid, staffName],
  );

  // ── Close session ──
  const closeSession = useCallback(
    async (closingData: {
      closingBalanceCents: number;
      expectedBalanceCents: number;
      differenceCents: number;
    }): Promise<boolean> => {
      if (!activeSession?.id) {
        setError('No active session to close.');
        return false;
      }
      setIsLoading(true);
      setError(null);
      try {
        if (!workspaceId) throw new Error('No workspace — please log in again.');
        const result = await window.api.firestore.cashSessions.close(
          workspaceId,
          activeSession.id!,
          {
            ...closingData,
            closedByName: staffName,
          },
        );
        if (!result.success)
          throw new Error(result.error ?? 'Failed to close session');
        // Real-time listener will set activeSession to null
        return true;
      } catch (err: any) {
        setError(userFriendlyError(err, 'closing cash session'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId, staffName, activeSession?.id],
  );

  // ── Refresh active (one-shot) ──
  const refreshActive = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result =
        await window.api.firestore.cashSessions.getActive(workspaceId);
      if (result.success) {
        setActiveSession(result.session ?? null);
      } else {
        throw new Error(result.error ?? 'Failed to fetch active session');
      }
    } catch (err: any) {
      setError(userFriendlyError(err, 'fetching active cash session'));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // ── Fetch history ──
  const fetchHistory = useCallback(
    async (filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) => {
      if (!workspaceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.api.firestore.cashSessions.history(
          workspaceId,
          filters ?? {},
        );
        if (result.success) {
          setSessions(result.sessions ?? []);
        } else {
          throw new Error(result.error ?? 'Failed to fetch session history');
        }
      } catch (err: any) {
        setError(userFriendlyError(err, 'fetching cash session history'));
      } finally {
        setIsLoading(false);
      }
    },
    [workspaceId],
  );

  return {
    activeSession,
    sessions,
    isLoading,
    error,
    openSession,
    closeSession,
    refreshActive,
    fetchHistory,
    clearError,
  };
}
