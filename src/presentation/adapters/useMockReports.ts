/**
 * useMockReports.ts — Reports hook backed by computed mock data.
 */

import { useState, useCallback, useMemo } from 'react';

export function useMockReports() {
  const [isLoadingSales, setIsLoading] = useState(false);

  const salesData = useMemo(() => [
    { period: '2026-08-01', totalOrders: 47, totalRevenueCents: 4850000, averageOrderValueCents: 103191 },
    { period: '2026-07-31', totalOrders: 52, totalRevenueCents: 5320000, averageOrderValueCents: 102307 },
    { period: '2026-07-30', totalOrders: 38, totalRevenueCents: 3890000, averageOrderValueCents: 102368 },
  ], []);

  const revenueData = useMemo(() => ({
    totalRevenueCents: 4850000, totalTaxCents: 242500, totalTipsCents: 0,
    netRevenueCents: 4607500, orderCount: 47, averageOrderCents: 103191,
  }), []);

  const topProducts = useMemo(() => [
    { productId: 'm1', name: 'Butter Chicken', quantitySold: 24, revenueCents: 1320000 },
    { productId: 'm6', name: 'Biryani', quantitySold: 18, revenueCents: 540000 },
    { productId: 'm3', name: 'Dal Makhani', quantitySold: 15, revenueCents: 480000 },
    { productId: 'm2', name: 'Paneer Tikka', quantitySold: 22, revenueCents: 616000 },
    { productId: 'm10', name: 'Palak Paneer', quantitySold: 12, revenueCents: 288000 },
  ], []);

  const paymentMethods = useMemo(() => [
    { method: 'cash', count: 18, totalCents: 1800000, percentage: 37 },
    { method: 'card', count: 15, totalCents: 1650000, percentage: 34 },
    { method: 'upi', count: 10, totalCents: 970000, percentage: 20 },
    { method: 'wallet', count: 4, totalCents: 430000, percentage: 9 },
  ], []);

  const employeePerformance = useMemo(() => [
    { employeeId: 'e1', name: 'Raj Kumar', ordersServed: 18, revenueCents: 1850000, shiftCount: 1, hoursWorked: 8 },
    { employeeId: 'e2', name: 'Meera Shah', ordersServed: 22, revenueCents: 2200000, shiftCount: 1, hoursWorked: 8.5 },
    { employeeId: 'e3', name: 'Arun Nair', ordersServed: 7, revenueCents: 800000, shiftCount: 1, hoursWorked: 7 },
  ], []);

  const fetchSalesReport = useCallback(async () => { setIsLoading(true); await new Promise(r => setTimeout(r, 300)); setIsLoading(false); }, []);
  const fetchRevenueSummary = useCallback(async () => {}, []);
  const fetchTopProducts = useCallback(async () => {}, []);
  const fetchPaymentBreakdown = useCallback(async () => {}, []);
  const fetchEmployeePerformance = useCallback(async () => {}, []);

  return {
    salesData, revenueData, topProducts, paymentMethods, employeePerformance,
    fetchSalesReport, fetchRevenueSummary, fetchTopProducts,
    fetchPaymentBreakdown, fetchEmployeePerformance,
    isLoadingSales,
  };
}
