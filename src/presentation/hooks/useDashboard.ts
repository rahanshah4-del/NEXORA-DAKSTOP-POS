/**
 * useDashboard.ts — Dashboard hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useQuery } from './useQuery';

export function useDashboard() {
  const dashboardStats = useQuery<Record<string, unknown>>('IGetDashboardStatsQuery', { autoFetch: false });
  const dailySummary = useQuery<Record<string, unknown>>('IGetDailySummaryQuery', { autoFetch: false });

  const fetchDashboard = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    await Promise.all([dashboardStats.refetch(), dailySummary.refetch({ date: today })]);
  }, [dashboardStats, dailySummary]);

  const stats = (dashboardStats.data?.items?.[0] ?? {}) as Record<string, number>;

  return {
    cards: [], stats, dailySummary: dailySummary.data?.items?.[0] ?? null,
    isLoading: dashboardStats.isLoading || dailySummary.isLoading,
    error: dashboardStats.error ?? dailySummary.error,
    refetch: fetchDashboard,
  };
}
