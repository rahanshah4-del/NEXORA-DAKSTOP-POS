import { useAuthStore } from '@/stores/auth-store';
import { useTableStore } from '@/stores/table-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconBar } from '@/components/layout/IconBar';
import { ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useDashboardMetrics, type FirestoreOrder } from '@/hooks/useDashboardMetrics';
import {
  TopBar, GreetingRow, HeroRevenueCard, OrdersCard, TablesCard,
  RevenueChart, LiveOrdersCard, TopSellersCard, StaffOnShiftCard,
  QuickActionsCard, DashboardFooterBar, DashboardLoading, ErrorBanner,
  useDashboardFormat, formatRole, type DashboardPeriod,
} from '@/components/dashboard';

/** Start of day, `daysBack` days before today. */
function dayStart(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Hard cap on an All-time read, so one huge workspace cannot stall the UI. */
const ALL_TIME_LIMIT = 2000;

/** The window each period covers. `from` is epoch for All time. */
function rangeFor(period: DashboardPeriod): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case 'yesterday': return { from: dayStart(1), to: dayStart(0) };
    case '7d': return { from: dayStart(6), to: now };
    case '30d': return { from: dayStart(29), to: now };
    case 'all': return { from: new Date(0), to: now };
    default: return { from: dayStart(0), to: now };
  }
}

const HERO_LABEL: Record<DashboardPeriod, string> = {
  today: "Today's revenue",
  yesterday: "Yesterday's revenue",
  '7d': 'Revenue · last 7 days',
  '30d': 'Revenue · last 30 days',
  all: 'Revenue · all time',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;
  const tables = useTableStore((s) => s.tables);
  const restaurantName = useSettingsStore((s) => s.restaurantName);
  const kdsEnabled = useSettingsStore((s) => s.kdsEnabled);
  const { isOnline, pendingSync, stuckSync, appVersion } = useSyncStatus();
  const { formatTime } = useDashboardFormat();

  // useLiveClock owns the 30s tick; the displayed time goes through the
  // dashboard formatter so the whole screen shares one locale.
  const clockTick = useLiveClock();
  const now = useMemo(() => new Date(), [clockTick]);
  const liveTime = useMemo(() => formatTime(now), [now, formatTime]);

  const staffDisplayName = staffProfile?.staffName?.trim() || 'Staff';
  const firstName = staffDisplayName.split(/\s+/)[0];
  const staffDisplayRole = formatRole(staffProfile?.staffRole);

  // Persisted in settings-store so the choice survives navigation and restart.
  const storedPeriod = useSettingsStore((s) => s.dashboardPeriod) as DashboardPeriod;
  const updateSettings = useSettingsStore((s) => s.update);
  const period: DashboardPeriod = (['today', 'yesterday', '7d', '30d', 'all'] as const)
    .includes(storedPeriod) ? storedPeriod : 'today';
  const setPeriod = useCallback(
    (p: DashboardPeriod) => updateSettings({ dashboardPeriod: p }),
    [updateSettings],
  );

  // ── Data state ──
  const range = useMemo(() => rangeFor(period), [period, clockTick]);

  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!wsId) return;
    setIsLoading(true);
    setError(null);
    try {
      // "Today" keeps the original request exactly: startDate only, today 00:00.
      // The other periods add an explicit range.
      const filters: Record<string, unknown> =
        period === 'today'
          ? { startDate: dayStart(0).toISOString() }
          : period === 'yesterday'
            ? { startDate: dayStart(1).toISOString(), endDate: dayStart(0).toISOString() }
            : period === '7d'
              ? { startDate: dayStart(6).toISOString() }
              : period === '30d'
                ? { startDate: dayStart(29).toISOString() }
                // All time: no lower bound, but never unbounded.
                : { limit: ALL_TIME_LIMIT };

      const result = await window.api.firestore.orders.list(wsId, filters);
      if (!result.success) {
        setError(userFriendlyError(result.error, 'loading dashboard'));
        return;
      }
      const rows = (result.orders ?? []) as FirestoreOrder[];
      setTruncated(period === 'all' && rows.length >= ALL_TIME_LIMIT);
      setOrders(rows);
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId, period]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Yesterday-to-date revenue, for the hero comparison chip ──
  const [yesterdayRevenue, setYesterdayRevenue] = useState<number | null>(null);

  useEffect(() => {
    if (!wsId || period !== 'today') { setYesterdayRevenue(null); return; }
    let cancelled = false;

    (async () => {
      try {
        const from = dayStart(1);
        // Same clock time yesterday, so the comparison is like-for-like.
        const to = new Date(from);
        const clock = new Date();
        to.setHours(clock.getHours(), clock.getMinutes(), clock.getSeconds(), 999);

        const res = await window.api.firestore.orders.list(wsId, {
          startDate: from.toISOString(),
          endDate: to.toISOString(),
        });
        if (cancelled) return;
        if (!res.success) { setYesterdayRevenue(null); return; }

        const total = ((res.orders ?? []) as FirestoreOrder[])
          .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
          .reduce((s, o) => s + (o.total ?? 0), 0);
        setYesterdayRevenue(total);
      } catch {
        if (!cancelled) setYesterdayRevenue(null);
      }
    })();

    return () => { cancelled = true; };
  }, [wsId, period]);

  // ── Open cash session, for the "Shift since" line ──
  const [shiftSince, setShiftSince] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!wsId) { setShiftSince(undefined); return; }
    let cancelled = false;

    (async () => {
      try {
        const res = await window.api.firestore.cashSessions.getActive(wsId) as any;
        const opened = res?.session?.openedAt ?? res?.session?.createdAt;
        if (cancelled) return;
        if (!res?.success || !opened) { setShiftSince(undefined); return; }
        const d = new Date(opened);
        setShiftSince(Number.isFinite(d.getTime()) ? formatTime(d) : undefined);
      } catch {
        if (!cancelled) setShiftSince(undefined);
      }
    })();

    return () => { cancelled = true; };
  }, [wsId, formatTime]);

  // ── Computed metrics ──
  const {
    todayOrders, revenue, avgOrderValue, paidCount, cancelledCount,
    topProducts, staffStats,
    paymentMix, orderTypeSplit, liveOrders, kitchenTickets,
    granularity, chartBuckets, chartPeak,
  } = useDashboardMetrics(orders, range);

  const totalOrderCount = todayOrders.length;
  const isToday = period === 'today';
  const activeTables = tables.filter((t) => t.status === 'occupied').length;

  const tableSquares = useMemo(
    () => tables.map((t) => ({ id: t.id, name: t.name || t.id, occupied: t.status === 'occupied' })),
    [tables],
  );
  const tableNameOf = useCallback(
    (id?: string) => (id ? tables.find((t) => t.id === id)?.name : undefined),
    [tables],
  );

  const changeVsYesterday = useMemo(() => {
    if (yesterdayRevenue === null || yesterdayRevenue <= 0) return null;
    return ((revenue - yesterdayRevenue) / yesterdayRevenue) * 100;
  }, [revenue, yesterdayRevenue]);

  // Only surface a business name once the owner has actually set one.
  const businessName = useMemo(() => {
    const n = (restaurantName ?? '').trim();
    return n && n.toLowerCase() !== 'nexora solution' ? n : undefined;
  }, [restaurantName]);

  // ── Render ──

  const renderContent = () => {
    if (isLoading) return <DashboardLoading />;
    if (error && orders.length === 0) return <ScreenErrorState error={error} onRetry={fetchOrders} />;

    const hasOrders = totalOrderCount > 0;

    return (
      <div className="space-y-[12px]">
        {error && orders.length > 0 && <ErrorBanner message={error} onRetry={fetchOrders} />}

        {/* Row 1 — hero spans two of four; below xl it takes the full width. */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px]">
          <HeroRevenueCard
            className="col-span-2"
            label={HERO_LABEL[period]}
            truncatedNote={truncated ? `Showing the most recent ${ALL_TIME_LIMIT.toLocaleString('en-PK')} orders` : undefined}
            revenue={revenue}
            paidCount={paidCount}
            avgOrderValue={avgOrderValue}
            cancelledCount={cancelledCount}
            changeVsYesterday={changeVsYesterday}
            paymentMix={paymentMix}
          />
          <OrdersCard
            className="col-span-1"
            totalOrderCount={totalOrderCount}
            paidCount={paidCount}
            cancelledCount={cancelledCount}
            orderTypeSplit={orderTypeSplit}
          />
          <TablesCard
            className="col-span-1"
            tables={tableSquares}
            occupied={activeTables}
            onFloorView={() => navigate('/tables')}
          />
        </div>

        {/* Row 2 — chart + live orders; stacks below xl. */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-[12px]">
          <RevenueChart
            className="xl:col-span-2"
            buckets={chartBuckets}
            granularity={granularity}
            peak={chartPeak}
            isToday={isToday}
            hasOrders={hasOrders}
          />
          <LiveOrdersCard
            orders={liveOrders}
            tableNameOf={tableNameOf}
            onViewAll={() => navigate('/orders')}
          />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[12px]">
          <TopSellersCard products={topProducts} />
          <StaffOnShiftCard
            stats={staffStats}
            currentStaffName={staffDisplayName}
            currentStaffRole={staffDisplayRole}
            isToday={isToday}
          />
          <QuickActionsCard
            className="md:col-span-2 xl:col-span-1"
            onNavigate={(path) => navigate(path)}
            kdsEnabled={kdsEnabled}
            kitchenTickets={kitchenTickets}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground font-sans text-pos-ink select-none">
      <IconBar />

      <div className="ml-rail flex min-w-0 flex-1 flex-col">
        <TopBar
          businessName={businessName}
          isOnline={isOnline}
          pendingSync={pendingSync}
          stuckSync={stuckSync}
          staffName={staffDisplayName}
          staffRole={staffDisplayRole}
          shiftSince={shiftSince}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[16px] pt-[12px] pb-[28px]">
          <GreetingRow
            firstName={firstName}
            now={now}
            period={period}
            onPeriodChange={setPeriod}
            isLoading={isLoading}
            onRefresh={fetchOrders}
            onNewOrder={() => navigate('/billing')}
          />
          <div className="mt-3">{renderContent()}</div>
        </div>

        <DashboardFooterBar pendingSync={pendingSync} updatedAt={liveTime} appVersion={appVersion} />
      </div>
    </div>
  );
}
