import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useAuthStore } from '@/stores/auth-store';
import { useTableStore } from '@/stores/table-store';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { IconBar } from '@/components/layout/IconBar';
import { WindowControls } from '@/components/layout/WindowControls';
import { TableSkeleton } from '@/screens/components/SkeletonLoader';
import { ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import nexoraLogo from '@/assets/icons/nexora-logo-64.png';
import {
  ChefHat, LayoutGrid, UtensilsCrossed, Package, BarChart3,
  ChevronDown, User, Clock,
  Banknote, Receipt, ShoppingCart, Users as UsersIcon,
  ArrowUpRight, Activity, Bell, RotateCw,
  Package as PackageIcon,
} from 'lucide-react';

// ── Types ──

interface FirestoreOrder {
  orderNumber: string;
  orderType: string;
  customer: string;
  cartRows?: Array<{ itemId: string; itemName: string; itemPrice: number; qty: number; note: string }>;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  staffName: string;
  createdAt: string;
}

interface ProductStat {
  name: string;
  qty: number;
  revenue: number;
}

interface StaffStat {
  name: string;
  orders: number;
  sales: number;
}

// ── Live Clock Hook ──

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── Sync / Connectivity Status Hook (mirrors Header.tsx) ──

interface SyncStatus {
  isOnline: boolean;
  /** null when the pending count could not be read. */
  pendingSync: number | null;
  stuckSync: number;
  /** null until (or unless) the app version is known. */
  appVersion: string | null;
}

function useSyncStatus(): SyncStatus {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingSync, setPendingSync] = useState<number | null>(null);
  const [stuckSync, setStuckSync] = useState(0);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const pollSync = async () => {
      try {
        const count = window.api?.local?.sync?.pendingCount;
        if (typeof count !== 'function') return;
        const r = await count();
        if (cancelled) return;
        setPendingSync(Number((r as any)?.count) || 0);
        setStuckSync(Number((r as any)?.stuck) || 0);
      } catch {
        if (!cancelled) setPendingSync(null);
      }
    };
    pollSync();
    const syncTimer = setInterval(pollSync, 15_000);

    let unsub: (() => void) | undefined;
    try {
      if (window.api?.local?.sync?.onResult) {
        unsub = window.api.local.sync.onResult(() => {
          pollSync();
        });
      }
    } catch { /* non-critical */ }

    (async () => {
      try {
        const getVersion = window.api?.app?.getVersion;
        if (typeof getVersion !== 'function') return;
        const v = await getVersion();
        if (!cancelled && typeof v === 'string' && v.trim()) setAppVersion(v.trim());
      } catch { /* non-critical — version stays hidden */ }
    })();

    return () => {
      cancelled = true;
      clearInterval(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsub) unsub();
    };
  }, []);

  return { isOnline, pendingSync, stuckSync, appVersion };
}

/** "cashier" → "Cashier", "head_chef" → "Head Chef". */
function formatRole(role: string | null | undefined): string {
  if (!role || !role.trim()) return '';
  return role
    .trim()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ── Component ──

export default function Dashboard() {
  const currSymbol = useCurrencySymbol();
  const navigate = useNavigate();
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;
  const tables = useTableStore((s) => s.tables);
  const liveTime = useLiveClock();
  const { isOnline, pendingSync, stuckSync, appVersion } = useSyncStatus();

  const staffDisplayName = staffProfile?.staffName?.trim() || 'Staff';
  const staffDisplayRole = formatRole(staffProfile?.staffRole);

  // Amounts on this screen are in major currency units (rupees), not cents.
  const formatMoney = (amount: number) => `${currSymbol}${amount.toLocaleString('en-PK')}`;

  // ── Data state ──
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!wsId) return;
    setIsLoading(true);
    setError(null);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const result = await window.api.firestore.orders.list(wsId, {
        startDate: todayStart.toISOString(),
      });
      if (!result.success) {
        setError(userFriendlyError(result.error, 'loading dashboard'));
        return;
      }
      setOrders((result.orders ?? []) as FirestoreOrder[]);
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Computed metrics ──

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      return new Date(o.createdAt).toDateString() === today;
    });
  }, [orders]);

  const paidOrders = useMemo(() => todayOrders.filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled'), [todayOrders]);

  const revenue = useMemo(() => paidOrders.reduce((s, o) => s + (o.total ?? 0), 0), [paidOrders]);
  const totalOrderCount = todayOrders.length;
  const avgOrderValue = paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0;

  const activeTables = tables.filter((t) => t.status === 'occupied').length;
  const totalTables = tables.length;

  // Hourly buckets
  const hourlyBuckets = useMemo(() => {
    const buckets: Record<number, { orders: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) buckets[h] = { orders: 0, revenue: 0 };
    for (const o of paidOrders) {
      if (!o.createdAt) continue;
      const h = new Date(o.createdAt).getHours();
      buckets[h].orders += 1;
      buckets[h].revenue += o.total ?? 0;
    }
    return Object.entries(buckets)
      .map(([hour, data]) => ({
        hour: `${parseInt(hour) % 12 || 12}${parseInt(hour) >= 12 ? 'PM' : 'AM'}`,
        orders: data.orders,
        revenue: data.revenue,
      }));
  }, [paidOrders]);

  const maxHourlyRev = Math.max(...hourlyBuckets.map((h) => h.revenue), 1);

  // Top products
  const topProducts: ProductStat[] = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const o of todayOrders) {
      for (const row of o.cartRows ?? []) {
        const key = row.itemName || 'Unknown';
        const prev = map.get(key) || { qty: 0, revenue: 0 };
        map.set(key, {
          qty: prev.qty + (row.qty ?? 0),
          revenue: prev.revenue + (row.qty ?? 0) * (row.itemPrice ?? 0),
        });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [todayOrders]);

  // Staff performance
  const staffStats: StaffStat[] = useMemo(() => {
    const map = new Map<string, { orders: number; sales: number }>();
    for (const o of todayOrders) {
      const key = o.staffName || 'Unknown';
      const prev = map.get(key) || { orders: 0, sales: 0 };
      map.set(key, {
        orders: prev.orders + 1,
        sales: prev.sales + (o.total ?? 0),
      });
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 6);
  }, [todayOrders]);

  // KPI cards
  const kpiCards = [
    {
      title: "Today's Revenue",
      value: totalOrderCount > 0 ? formatMoney(revenue) : '—',
      sub: totalOrderCount > 0 ? `${paidOrders.length} paid orders` : 'No orders today',
      icon: Banknote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Total Orders',
      value: String(totalOrderCount),
      sub: `${paidOrders.length} paid · ${todayOrders.filter((o) => o.orderStatus === 'cancelled').length} cancelled`,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Tables',
      value: totalTables > 0 ? `${activeTables}/${totalTables}` : '—',
      sub: totalTables > 0 ? `${activeTables} occupied · ${totalTables - activeTables} free` : 'No tables configured',
      icon: LayoutGrid,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Avg. Order Value',
      value: avgOrderValue > 0 ? formatMoney(avgOrderValue) : '—',
      sub: totalOrderCount > 0 ? `${totalOrderCount} orders today` : 'No orders today',
      icon: Receipt,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  // ── Render ──

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e6e6e7] p-4">
                <div className="h-4 w-24 bg-gray-200 rounded mb-3 animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded mb-1 animate-pulse" />
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={4} cols={4} />
        </div>
      );
    }

    if (error && orders.length === 0) {
      return <ScreenErrorState error={error} onRetry={fetchOrders} />;
    }

    const hasOrders = totalOrderCount > 0;

    return (
      <div className="p-4 pb-10 space-y-4">
        {/* Error banner when we have stale data */}
        {error && orders.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={fetchOrders} className="text-[10px] font-semibold underline hover:text-red-900">Retry</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          {kpiCards.map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#e6e6e7] shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold text-[#757575] uppercase tracking-wider">{kpi.title}</span>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                  <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                </div>
              </div>
              <p className="text-[22px] font-bold text-[#111814] tracking-tight">{kpi.value}</p>
              <span className="text-[10px] text-[#757575] mt-1">{kpi.sub}</span>
            </div>
          ))}
        </div>

        {/* Branding Card */}
        <div className="bg-white rounded-xl border border-[#e6e6e7] shadow-sm p-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0">
            <img src={nexoraLogo} alt="Nexora Solution" className="h-14 w-14 object-contain" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111814]">Nexora Solution</h3>
            <p className="text-xs text-[#94a399]">Enterprise POS Platform</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={cn('flex items-center gap-1 text-[10px] font-medium', isOnline ? 'text-[#42b273]' : 'text-[#da3849]')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-[#42b273]' : 'bg-[#da3849]')} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {pendingSync === null ? (
                <span className="flex items-center gap-1 text-[10px] text-[#94a399] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#94a399]" />Sync status unavailable</span>
              ) : stuckSync > 0 ? (
                <span className="flex items-center gap-1 text-[10px] text-[#da3849] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#da3849]" />{stuckSync} stuck in sync</span>
              ) : pendingSync > 0 ? (
                <span className="flex items-center gap-1 text-[10px] text-[#d97706] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />{pendingSync} pending sync</span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-[#8b5cf6] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />All synced</span>
              )}
              {appVersion && <span className="text-[10px] text-[#94a399] ml-2">v{appVersion}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Hourly Trend */}
          <div className="col-span-2 bg-white rounded-xl border border-[#e6e6e7] shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-semibold text-[#333333]">Hourly Revenue Trend</h3>
              <span className="text-[10px] text-[#94a399]">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            {!hasOrders ? (
              <div className="flex items-center justify-center h-[180px] text-[#94a399] text-xs">
                <div className="text-center">
                  <PackageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No orders today — chart will populate as orders come in
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-3 h-[180px]">
                {hourlyBuckets.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-[#47554d]">
                      {h.revenue > 0 ? `${currSymbol}${(h.revenue / 1000).toFixed(1)}k` : '—'}
                    </span>
                    <div
                      className="w-full bg-[#0f7b47] rounded-t-md hover:bg-[#056638] transition-colors cursor-pointer relative group min-h-[2px]"
                      style={{ height: `${Math.max((h.revenue / maxHourlyRev) * 140, h.revenue > 0 ? 4 : 0)}px` }}
                    >
                      {h.revenue > 0 && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#111814] text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatMoney(h.revenue)} • {h.orders} orders
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-[#94a399]">{h.hour}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl border border-[#e6e6e7] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-semibold text-[#333333]">Top Products</h3>
            </div>
            {topProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-[#94a399] text-xs text-center">
                <div>
                  <PackageIcon className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  No products sold today
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-[#f0f0f0] last:border-0">
                    <span className="text-[11px] font-bold text-[#94a399] w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-[#111814] truncate">{p.name}</p>
                      <p className="text-[9px] text-[#94a399]">{p.qty} sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold">{formatMoney(p.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff Performance */}
          <div className="col-span-2 bg-white rounded-xl border border-[#e6e6e7] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-semibold text-[#333333]">Staff Performance</h3>
              <span className="text-[10px] text-[#94a399]">Today</span>
            </div>
            {staffStats.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] text-[#94a399] text-xs text-center">
                <div>
                  <UsersIcon className="h-6 w-6 mx-auto mb-1 opacity-30" />
                  No staff activity today
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#dfdfdf]">
                    {['Staff', 'Orders', 'Sales'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold text-[#757575] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0]">
                  {staffStats.map((s, i) => (
                    <tr key={i} className="hover:bg-[#f8faf9] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[#cceddb] flex items-center justify-center">
                            <span className="text-[10px] font-bold text-[#0f7b47]">{s.name.charAt(0)}</span>
                          </div>
                          <span className="text-[11px] font-medium text-[#111814]">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold">{s.orders}</td>
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-[#111814]">{formatMoney(s.sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#554cc5] rounded-xl shadow-sm p-4 text-white">
            <h3 className="text-[12px] font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: 'New Order', icon: UtensilsCrossed, path: '/billing' },
                { label: 'Manage Tables', icon: LayoutGrid, path: '/tables' },
                { label: 'View KDS', icon: ChefHat, path: '/kitchen' },
                { label: 'Add Product', icon: Package, path: '/products' },
                { label: 'View Reports', icon: BarChart3, path: '/reports' },
              ].map((a) => (
                <button key={a.label} onClick={() => navigate(a.path)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                  <a.icon className="h-4 w-4 text-white/70" />
                  <span className="text-[11px] font-medium">{a.label}</span>
                  <ArrowUpRight className="h-3 w-3 ml-auto text-white/50" />
                </button>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center gap-2 text-[10px] text-white/60">
                <Activity className="h-3 w-3" />
                <span>Status: <span className="text-emerald-300 font-semibold">Operational</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f6fa] select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-[56px]">
        <header className="flex items-center h-[48px] px-4 bg-white border-b border-[#e2e8e4] shrink-0">
          <h1 className="text-[14px] font-bold text-[#111814] tracking-tight">Nexora Solution</h1>
          <span className="h-4 w-px bg-[#dee2e6] mx-2.5" />
          <span className="text-[11px] text-[#94a399] font-medium">Dashboard</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag">
            <span className="text-[11px] text-[#47554d] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#94a399]" />{liveTime}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-[#47554d]">
              <div className="h-6 w-6 rounded-full bg-[#cceddb] flex items-center justify-center"><User className="h-3 w-3 text-[#0f7b47]" /></div>
              <div className="flex flex-col leading-tight max-w-[140px]">
                <span className="truncate font-medium text-[#111814]" title={staffDisplayName}>{staffDisplayName}</span>
                {staffDisplayRole && <span className="truncate text-[9px] text-[#94a399]">{staffDisplayRole}</span>}
              </div>
              <ChevronDown className="h-3 w-3 text-[#94a399]" />
            </div>
            <WindowControls className="ml-1 [&>button]:h-7 [&>button]:w-9 [&>button]:rounded" />
          </div>
        </header>

        <div className="flex items-center h-[40px] px-4 bg-white border-b border-[#dee2e6] shrink-0">
          <h2 className="text-[13px] font-semibold text-[#333333]">Business Overview</h2>
          <span className="text-[11px] text-[#94a399] ml-2">Today's Overview</span>
          <div className="flex-1" />
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#47554d] hover:text-[#111814] hover:bg-[#f1f5f2] rounded transition-colors disabled:opacity-50"
          >
            <RotateCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />Refresh
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {renderContent()}
        </div>

        <footer className="flex items-center justify-between h-[32px] px-3 bg-[#204937] shrink-0">
          <div className="flex items-center gap-3 text-[9px] text-white/70">
            <span>Today: <span className="text-white font-semibold">{totalOrderCount} orders</span></span>
            <span>Revenue: <span className="text-white font-semibold">{formatMoney(revenue)}</span></span>
            <span>Tables: <span className="text-white font-semibold">{totalTables > 0 ? `${activeTables}/${totalTables} active` : '—'}</span></span>
          </div>
          <div className="text-[9px] text-white/60 flex items-center gap-3">
            <span className="flex items-center gap-1"><Bell className="h-3 w-3" />Last updated: {liveTime}</span>
            <span className="text-white/40">|</span>
            <span>{appVersion ? <>v{appVersion} &mdash; </> : null}Powered by Nexora Solution</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
