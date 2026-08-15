/**
 * useMockDashboard.ts — Dashboard hook composing data from multiple mock sources.
 */

import { useState, useCallback, useMemo } from 'react';

export function useMockDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => ({
    todayRevenueCents: 4850000, // ₹48,500
    todayOrderCount: 47,
    activeOrders: 12,
    occupiedTables: 8,
    totalProducts: 16,
    totalCustomers: 5,
    staffOnDuty: 3,
  }), []);

  const cards = useMemo(() => [
    { title: "Today's Revenue", value: '₹48,500.00', icon: 'dollar-sign', trend: 'up' as const, trendValue: '+12.5%' },
    { title: 'Active Orders', value: '12', icon: 'clipboard-list', trend: 'up' as const, trendValue: '' },
    { title: 'Orders Today', value: '47', icon: 'shopping-cart', trend: 'neutral' as const, trendValue: '' },
    { title: 'Tables', value: '8 occupied', icon: 'table', trend: 'neutral' as const, trendValue: '' },
  ], []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    setIsLoading(false);
  }, []);

  return {
    cards, stats,
    dailySummary: {
      date: new Date().toISOString().split('T')[0],
      totalOrders: 47, totalRevenueCents: 4850000,
      completedOrders: 35, cancelledOrders: 2,
    },
    isLoading, error, refetch,
  };
}
