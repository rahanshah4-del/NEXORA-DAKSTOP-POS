/**
 * DashboardViewModel.ts — Transforms report/dashboard data to UI-friendly shapes.
 */

import type { Order } from '../../types/models';

export interface DashboardCardData {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}

export interface SalesChartPoint {
  label: string;
  value: number;
}

export class DashboardViewModel {
  static centsToDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /** Build dashboard KPI cards from order data. */
  static buildCards(
    todayRevenueCents: number,
    todayOrderCount: number,
    activeOrders: number,
    occupiedTables: number,
  ): DashboardCardData[] {
    return [
      {
        title: "Today's Revenue",
        value: this.centsToDollars(todayRevenueCents),
        subtitle: `${todayOrderCount} orders today`,
        icon: 'dollar-sign',
        trend: todayRevenueCents > 0 ? 'up' : 'neutral',
        trendValue: '',
      },
      {
        title: 'Active Orders',
        value: String(activeOrders),
        subtitle: `${occupiedTables} tables occupied`,
        icon: 'clipboard-list',
        trend: activeOrders > 0 ? 'up' : 'neutral',
        trendValue: '',
      },
      {
        title: 'Orders Today',
        value: String(todayOrderCount),
        subtitle: 'Completed & in progress',
        icon: 'shopping-cart',
        trend: 'neutral',
        trendValue: '',
      },
      {
        title: 'Tables',
        value: String(occupiedTables),
        subtitle: 'Currently occupied',
        icon: 'table',
        trend: 'neutral',
        trendValue: '',
      },
    ];
  }

  /** Build hourly sales chart data. */
  static buildHourlySales(orders: Order[]): SalesChartPoint[] {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      label: `${i}:00`,
      value: 0,
    }));

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      hours[hour].value += order.totalCents / 100; // Convert to dollars
    }

    return hours;
  }

  /** Calculate summary metrics. */
  static calculateSummary(orders: Order[]) {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((s, o) => s + o.totalCents, 0);
    const avgOrder = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      totalRevenueCents: totalRevenue,
      totalRevenueFormatted: this.centsToDollars(totalRevenue),
      averageOrderValue: this.centsToDollars(Math.round(avgOrder)),
      paidOrderCount: paidOrders.length,
      totalOrderCount: orders.length,
    };
  }
}
