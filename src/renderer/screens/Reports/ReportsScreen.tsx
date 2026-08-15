import React, { useEffect, useState } from 'react';
import { useReports } from '@/presentation/hooks/useReports';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Table as UITable } from '@/components/ui/Table';
import { StatsCard } from '@/components/shared/StatsCard';
import { formatCurrency } from '@/utils/formatters';
import { CardSkeleton } from '../components/SkeletonLoader';
import { Download, DollarSign, ShoppingCart, TrendingUp, CreditCard } from 'lucide-react';

const REPORT_TABS = [{ id: 'sales', label: 'Sales' }, { id: 'products', label: 'Products' }, { id: 'payments', label: 'Payments' }, { id: 'staff', label: 'Staff' }];

export const ReportsScreen: React.FC = () => {
  const { salesData, fetchSalesReport, isLoadingSales, revenueData, fetchRevenueSummary, topProducts, fetchTopProducts, paymentMethods, fetchPaymentBreakdown, employeePerformance, fetchEmployeePerformance } = useReports() as any;
  const [activeTab, setActiveTab] = useState('sales');
  const [dateRange, setDateRange] = useState({ start: '2026-08-01', end: '2026-08-01' });

  useEffect(() => {
    fetchSalesReport?.(dateRange.start, dateRange.end);
    fetchRevenueSummary?.(dateRange.start, dateRange.end);
    fetchTopProducts?.(dateRange.start, dateRange.end, 10);
    fetchPaymentBreakdown?.(dateRange.start, dateRange.end);
    fetchEmployeePerformance?.(dateRange.start, dateRange.end);
  }, [dateRange]);

  const handleExport = () => {
    const data = activeTab === 'sales' ? salesData : activeTab === 'products' ? topProducts : activeTab === 'payments' ? paymentMethods : employeePerformance;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nexora-${activeTab}-report.json`; a.click();
  };

  const productCols = [
    { key: 'rank', header: '#', accessor: (_: any, idx: number) => <span className="font-bold text-content-secondary">{idx + 1}</span> },
    { key: 'name', header: 'Product', accessor: (p: any) => <span className="font-medium">{p.name}</span> },
    { key: 'qty', header: 'Sold', accessor: (p: any) => <span className="font-mono tabular-nums">{p.quantitySold}</span> },
    { key: 'rev', header: 'Revenue', accessor: (p: any) => <span className="font-mono font-semibold text-primary tabular-nums">{formatCurrency(p.revenueCents)}</span> },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Reports">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-content">Reports</h1><p className="text-sm text-content-secondary mt-0.5">Analyze restaurant performance</p></div>
        <div className="flex items-center gap-3">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" aria-label="Start date" />
          <span className="text-content-tertiary text-sm">to</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" aria-label="End date" />
          <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>Export</Button>
        </div>
      </div>

      {isLoadingSales ? (
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
      ) : revenueData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Revenue" value={formatCurrency(revenueData.totalRevenueCents)} icon={DollarSign} changeType="positive" change="+12.5%" />
          <StatsCard title="Orders" value={revenueData.orderCount} icon={ShoppingCart} />
          <StatsCard title="Avg. Order" value={formatCurrency(revenueData.averageOrderCents)} icon={TrendingUp} />
          <StatsCard title="Net Revenue" value={formatCurrency(revenueData.netRevenueCents)} icon={CreditCard} />
        </div>
      ) : null}

      <Tabs tabs={REPORT_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <Card padding="none" className="overflow-hidden">
        {activeTab === 'products' && <UITable columns={productCols} data={topProducts ?? []} keyExtractor={(p: any) => p.productId} isLoading={isLoadingSales} emptyState={<div className="py-10 text-center text-sm text-content-tertiary">No data</div>} />}
        {activeTab === 'payments' && <UITable columns={[
          { key: 'method', header: 'Method', accessor: (p: any) => <span className="font-medium capitalize">{p.method}</span> },
          { key: 'total', header: 'Total', accessor: (p: any) => <span className="font-mono font-semibold tabular-nums">{formatCurrency(p.totalCents)}</span> },
          { key: 'pct', header: 'Share', accessor: (p: any) => <div className="flex items-center gap-2"><div className="w-16 h-2 bg-surface-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.percentage}%` }} /></div><span className="text-xs font-mono">{p.percentage}%</span></div> },
        ]} data={paymentMethods ?? []} keyExtractor={(p: any) => p.method} isLoading={isLoadingSales} />}
        {activeTab === 'staff' && <UITable columns={[
          { key: 'name', header: 'Employee', accessor: (s: any) => <span className="font-medium">{s.name}</span> },
          { key: 'orders', header: 'Orders', accessor: (s: any) => <span className="font-mono tabular-nums">{s.ordersServed}</span> },
          { key: 'rev', header: 'Revenue', accessor: (s: any) => <span className="font-mono font-semibold text-primary tabular-nums">{formatCurrency(s.revenueCents)}</span> },
          { key: 'hours', header: 'Hours', accessor: (s: any) => <span className="font-mono tabular-nums">{s.hoursWorked}h</span> },
        ]} data={employeePerformance ?? []} keyExtractor={(s: any) => s.employeeId} isLoading={isLoadingSales} />}
      </Card>
    </div>
  );
};
