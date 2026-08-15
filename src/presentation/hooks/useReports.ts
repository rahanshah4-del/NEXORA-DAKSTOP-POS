/**
 * useReports.ts — Report hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useQuery } from './useQuery';

export function useReports() {
  const sales = useQuery<Record<string, unknown>>('IGetSalesReportQuery', { autoFetch: false });
  const revenue = useQuery<Record<string, unknown>>('IGetRevenueSummaryQuery', { autoFetch: false });
  const topProductsQ = useQuery<Record<string, unknown>>('IGetTopSellingProductsQuery', { autoFetch: false });
  const paymentsQ = useQuery<Record<string, unknown>>('IGetPaymentMethodBreakdownQuery', { autoFetch: false });
  const staffPerf = useQuery<Record<string, unknown>>('IGetEmployeePerformanceQuery', { autoFetch: false });

  return {
    salesData: sales.data?.items ?? [], fetchSalesReport: (s: string, e: string) => sales.refetch({ startDate: s, endDate: e }),
    revenueData: revenue.data?.items?.[0] ?? null, fetchRevenueSummary: (s: string, e: string) => revenue.refetch({ startDate: s, endDate: e }),
    topProducts: topProductsQ.data?.items ?? [], fetchTopProducts: (s: string, e: string, l = 10) => topProductsQ.refetch({ startDate: s, endDate: e, limit: l }),
    paymentMethods: paymentsQ.data?.items ?? [], fetchPaymentBreakdown: (s: string, e: string) => paymentsQ.refetch({ startDate: s, endDate: e }),
    employeePerformance: staffPerf.data?.items ?? [], fetchEmployeePerformance: (s: string, e: string) => staffPerf.refetch({ startDate: s, endDate: e }),
    isLoadingSales: sales.isLoading || revenue.isLoading,
  };
}
