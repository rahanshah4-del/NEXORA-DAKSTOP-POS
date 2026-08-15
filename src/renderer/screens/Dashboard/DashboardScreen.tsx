import React, { useEffect, memo } from 'react';
import { useDashboard } from '@/presentation/hooks/useDashboard';
import { useOrders } from '@/presentation/hooks/useOrders';
import { useKitchen } from '@/presentation/hooks/useKitchen';
import { useTables } from '@/presentation/hooks/useTables';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table as UITable } from '@/components/ui/Table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency, formatTime } from '@/utils/formatters';
import { CardSkeleton } from '../components/SkeletonLoader';
import { ScreenErrorState } from '../components/ScreenStates';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { OrderViewModel } from '@/presentation/viewModels/OrderViewModel';
import { DollarSign, ShoppingCart, Table, ChefHat, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

const StatCard = memo(({ title, value, icon: Icon, subtitle, trend, color = 'primary' }: {
  title: string; value: number | string; icon: React.FC<any>; subtitle?: string;
  trend?: 'up' | 'down' | 'neutral'; color?: string;
}) => (
  <Card hover padding="lg" className="group transition-all duration-200 hover:shadow-md">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider">{title}</p>
        <div className="text-2xl font-bold text-content tabular-nums">
          {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
        </div>
        {subtitle && <p className="text-xs text-content-tertiary">{subtitle}</p>}
        {trend && (
          <span className={cn('inline-flex items-center gap-1 text-xs font-medium',
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-content-tertiary')}>
            <TrendingUp className={cn('w-3 h-3', trend === 'down' && 'rotate-180')} />
            {trend === 'up' ? '+12.5%' : trend === 'down' ? '-3.2%' : '—'}
          </span>
        )}
      </div>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
        `bg-${color}/10 text-${color} group-hover:bg-${color}/20`)}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
));

export const DashboardScreen: React.FC = () => {
  const { cards, stats, isLoading, error, refetch } = useDashboard();
  const { activeOrders } = useOrders() as any;
  const { tickets } = useKitchen() as any;
  const { tables } = useTables() as any;

  useEffect(() => { refetch(); }, []);

  if (error) return <ScreenErrorState error={error} onRetry={refetch} />;

  const availableTables = (tables ?? []).filter((t: any) => t.isAvailable).length;
  const kitchenPending = (tickets ?? []).filter((t: any) => t.status !== 'completed').length;
  const kitchenReady = (tickets ?? []).filter((t: any) => t.status === 'ready').length;

  const orderCols = [
    { key: 'num', header: '#', accessor: (o: any) => <span className="font-mono font-semibold text-xs">#{o.orderNumber}</span> },
    { key: 'table', header: 'Table', accessor: (o: any) => <span className="text-sm">{o.tableName || '—'}</span> },
    { key: 'status', header: 'Status', accessor: (o: any) => <StatusBadge status={o.status} /> },
    { key: 'total', header: 'Total', accessor: (o: any) => <span className="font-mono text-sm font-medium">{o.total}</span> },
    { key: 'time', header: 'Time', accessor: (o: any) => <span className="text-xs text-content-tertiary">{formatTime(o.createdAt)}</span> },
  ];

  const kitchenCols = [
    { key: 'tbl', header: 'Table', accessor: (t: any) => <span className="text-sm">{t.tableName || '—'}</span> },
    { key: 'order', header: 'Order', accessor: (t: any) => <span className="font-mono text-xs">#{t.orderNumber}</span> },
    { key: 'status', header: 'Status', accessor: (t: any) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', accessor: (t: any) => (
      <Badge variant={t.priority === 'high' ? 'danger' : t.priority === 'rush' ? 'warning' : 'default'} size="sm">{t.priority}</Badge>
    )},
    { key: 'wait', header: 'Wait', accessor: (t: any) => {
      const mins = Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 60000);
      return <span className={cn('text-xs font-medium tabular-nums', mins > 20 ? 'text-danger' : mins > 10 ? 'text-warning' : 'text-content-secondary')}>{mins}m</span>;
    }},
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-content">Dashboard</h1>
        <p className="text-sm text-content-secondary mt-0.5">Overview of your restaurant today</p>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today's Revenue" value={stats?.todayRevenueCents ?? 0} icon={DollarSign} subtitle={`${stats?.todayOrderCount ?? 0} orders`} trend="up" color="primary" />
          <StatCard title="Active Orders" value={stats?.activeOrders ?? 0} icon={ShoppingCart} subtitle={`${kitchenReady} ready`} color="info" />
          <StatCard title="Tables" value={stats?.occupiedTables ?? 0} icon={Table} subtitle={`${availableTables} available`} color="success" />
          <StatCard title="Kitchen Queue" value={kitchenPending} icon={ChefHat} subtitle={`${kitchenReady} ready to serve`} color="warning" />
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card padding="none" className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Badge variant="primary" size="sm">{(activeOrders ?? []).length} active</Badge>
          </CardHeader>
          <UITable
            columns={orderCols} data={activeOrders?.slice(0, 6) ?? []}
            keyExtractor={(o: any) => o.id} isLoading={isLoading} loadingRows={6}
            emptyState={<div className="py-10 text-center text-sm text-content-tertiary">No active orders</div>}
          />
        </Card>

        {/* Kitchen Queue */}
        <Card padding="none" className="overflow-hidden">
          <CardHeader>
            <CardTitle>Kitchen Queue</CardTitle>
            <Badge variant="warning" size="sm">{kitchenPending} tickets</Badge>
          </CardHeader>
          <UITable
            columns={kitchenCols} data={(tickets ?? []).filter((t: any) => t.status !== 'completed').slice(0, 6)}
            keyExtractor={(t: any) => t.id} isLoading={isLoading} loadingRows={6}
            emptyState={<div className="py-10 text-center text-sm text-content-tertiary">Kitchen queue is clear</div>}
          />
        </Card>
      </div>
    </div>
  );
};
