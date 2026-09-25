import { useMemo } from 'react';

// ── Types ──

export interface FirestoreOrder {
  orderNumber: string;
  orderType: string;
  customer: string;
  cartRows?: Array<{ itemId: string; itemName: string; itemPrice: number; qty: number; note: string }>;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  staffName: string;
  createdAt: string;
  /** Already written by the POS (PosOrder.paymentMethod), e.g. "Cash", "Wallet". */
  paymentMethod?: string;
  /** Table id as stored on the order; resolved to a name via the table store. */
  table?: string;
}

export interface ProductStat {
  name: string;
  qty: number;
  revenue: number;
}

export interface StaffStat {
  name: string;
  orders: number;
  sales: number;
}

export interface HourlyBucket {
  hour: string;
  orders: number;
  revenue: number;
}

/** One slice of the payment mix; only groups with a share are emitted. */
export interface PaymentMixSlice {
  key: 'cash' | 'card' | 'digital';
  label: string;
  amount: number;
  share: number;
}

/** One order-type slice (Dine-in / Takeaway / Delivery / …), real values only. */
export interface OrderTypeSlice {
  label: string;
  count: number;
  share: number;
}

export interface PeakHour {
  hour: string;
  revenue: number;
}

/** How the revenue chart groups the selected range. */
export type Granularity = 'hour' | 'day' | 'week' | 'month';

/** One chart column. `key` sorts; `label` is what the axis shows. */
export interface ChartBucket {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  /** Hour of day 0–23; only set at 'hour' granularity. */
  hour?: number;
}

/** The window the metrics were computed over. */
export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardMetrics {
  todayOrders: FirestoreOrder[];
  paidOrders: FirestoreOrder[];
  revenue: number;
  avgOrderValue: number;
  paidCount: number;
  cancelledCount: number;
  hourlyBuckets: HourlyBucket[];
  maxHourlyRev: number;
  topProducts: ProductStat[];
  staffStats: StaffStat[];
  // ── Added for the redesign; every existing field above is unchanged. ──
  /** Empty when no paid order carries a payment method. */
  paymentMix: PaymentMixSlice[];
  /** Empty when no order carries an order type. */
  orderTypeSplit: OrderTypeSlice[];
  /** Today's most recent orders, newest first (at most 5). */
  liveOrders: FirestoreOrder[];
  /** Busiest paid hour today; null when nothing has been paid. */
  peakHour: PeakHour | null;
  /** Today's orders still in a kitchen status (pending/preparing/ready). */
  kitchenTickets: number;
  // ── Range-aware additions ──
  /** Orders inside the selected range. `todayOrders` is kept as an alias. */
  periodOrders: FirestoreOrder[];
  /** Chart grouping chosen from the effective span of the data. */
  granularity: Granularity;
  /** Chart columns for the selected range, oldest first. */
  chartBuckets: ChartBucket[];
  /** Busiest chart column; null when nothing was paid in range. */
  chartPeak: { label: string; revenue: number } | null;
}

/**
 * All derived dashboard figures, computed from the raw order list.
 *
 * The memo bodies are moved unchanged from pages/Dashboard.tsx — same
 * filters, same rounding, same sort order and same slice limits.
 */
/** Midnight-anchored start of the day containing `d`. */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Monday-anchored start of the week containing `d`. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  // getDay(): 0 = Sunday. Shift so Monday is the first day.
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hourLabel = (h: number) => `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;

/** Parse an ISO createdAt defensively; invalid or missing values yield null. */
function parseCreatedAt(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function useDashboardMetrics(
  orders: FirestoreOrder[],
  range?: DateRange,
): DashboardMetrics {
  // Default keeps the pre-range behaviour: the current calendar day.
  const from = range?.from ?? startOfDay(new Date());
  const to = range?.to ?? new Date(startOfDay(new Date()).getTime() + 86_400_000);
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const periodOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = parseCreatedAt(o.createdAt);
      if (!d) return false;
      const t = d.getTime();
      return t >= fromMs && t < toMs;
    });
  }, [orders, fromMs, toMs]);

  // Kept so existing consumers of `todayOrders` keep compiling.
  const todayOrders = periodOrders;

  const paidOrders = useMemo(() => todayOrders.filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled'), [todayOrders]);

  const revenue = useMemo(() => paidOrders.reduce((s, o) => s + (o.total ?? 0), 0), [paidOrders]);
  const avgOrderValue = paidOrders.length > 0 ? Math.round(revenue / paidOrders.length) : 0;

  const paidCount = paidOrders.length;
  const cancelledCount = useMemo(() => todayOrders.filter((o) => o.orderStatus === 'cancelled').length, [todayOrders]);

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

  // ── Payment mix (paid orders that actually carry a method) ──
  const paymentMix: PaymentMixSlice[] = useMemo(() => {
    const groups: Record<'cash' | 'card' | 'digital', number> = { cash: 0, card: 0, digital: 0 };
    let known = 0;
    for (const o of paidOrders) {
      const raw = (o.paymentMethod ?? '').trim().toLowerCase();
      if (!raw) continue;
      const key: 'cash' | 'card' | 'digital' = raw.includes('card')
        ? 'card'
        : raw.includes('cash') || raw === 'split'
          ? 'cash'
          : 'digital';
      groups[key] += o.total ?? 0;
      known += o.total ?? 0;
    }
    if (known <= 0) return [];
    const labels = { cash: 'Cash', card: 'Card', digital: 'Digital wallets' } as const;
    return (['cash', 'card', 'digital'] as const)
      .filter((k) => groups[k] > 0)
      .map((k) => ({ key: k, label: labels[k], amount: groups[k], share: groups[k] / known }));
  }, [paidOrders]);

  // ── Order-type split ──
  const orderTypeSplit: OrderTypeSlice[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of todayOrders) {
      const label = (o.orderType ?? '').trim();
      if (!label) continue;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count, share: count / total }))
      .sort((a, b) => b.count - a.count);
  }, [todayOrders]);

  // ── Most recent orders ──
  const liveOrders = useMemo(
    () => [...todayOrders]
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, 5),
    [todayOrders],
  );

  // ── Peak paid hour ──
  const peakHour: PeakHour | null = useMemo(() => {
    let best: PeakHour | null = null;
    for (const b of hourlyBuckets) {
      if (b.revenue > 0 && (!best || b.revenue > best.revenue)) best = { hour: b.hour, revenue: b.revenue };
    }
    return best;
  }, [hourlyBuckets]);

  // ── Kitchen tickets still open today (same statuses the KDS screen uses) ──
  const kitchenTickets = useMemo(
    () => todayOrders.filter((o) => ['pending', 'preparing', 'ready'].includes((o.orderStatus ?? '').toLowerCase())).length,
    [todayOrders],
  );

  // ── Chart grouping ──
  // The effective start is the later of the requested start and the first
  // order actually seen, so "All time" (start = epoch) picks a sensible
  // grain instead of always falling through to months.
  const granularity: Granularity = useMemo(() => {
    let earliest = Infinity;
    for (const o of paidOrders) {
      const d = parseCreatedAt(o.createdAt);
      if (d) earliest = Math.min(earliest, d.getTime());
    }
    const effFrom = Number.isFinite(earliest) ? Math.max(fromMs, earliest) : fromMs;
    const spanDays = (toMs - effFrom) / 86_400_000;
    if (spanDays <= 2) return 'hour';
    if (spanDays <= 31) return 'day';
    if (spanDays <= 26 * 7) return 'week';
    return 'month';
  }, [paidOrders, fromMs, toMs]);

  const chartBuckets: ChartBucket[] = useMemo(() => {
    // Hour grain keeps the familiar 24 hour-of-day columns.
    if (granularity === 'hour') {
      const acc: Array<{ orders: number; revenue: number }> = Array.from(
        { length: 24 }, () => ({ orders: 0, revenue: 0 }),
      );
      for (const o of paidOrders) {
        const d = parseCreatedAt(o.createdAt);
        if (!d) continue;
        acc[d.getHours()].orders += 1;
        acc[d.getHours()].revenue += o.total ?? 0;
      }
      return acc.map((v, h) => ({ key: pad(h), label: hourLabel(h), hour: h, ...v }));
    }

    // Date grains bucket by a canonical period start, then fill the gaps so
    // quiet days still occupy a column.
    const bucketStart = (d: Date) =>
      granularity === 'day' ? startOfDay(d)
        : granularity === 'week' ? startOfWeek(d)
          : new Date(d.getFullYear(), d.getMonth(), 1);

    const labelFor = (d: Date) =>
      granularity === 'day' ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
        : granularity === 'week' ? `wk ${d.getDate()} ${MONTHS[d.getMonth()]}`
          : `${MONTHS[d.getMonth()]} ${pad(d.getFullYear() % 100)}`;

    const map = new Map<string, { start: Date; orders: number; revenue: number }>();
    let min: Date | null = null;
    let max: Date | null = null;
    for (const o of paidOrders) {
      const d = parseCreatedAt(o.createdAt);
      if (!d) continue;
      const start = bucketStart(d);
      const k = dayKey(start);
      const prev = map.get(k) ?? { start, orders: 0, revenue: 0 };
      prev.orders += 1;
      prev.revenue += o.total ?? 0;
      map.set(k, prev);
      if (!min || start < min) min = start;
      if (!max || start > max) max = start;
    }
    if (!min || !max) return [];

    const out: ChartBucket[] = [];
    const cursor = new Date(min);
    while (cursor <= max) {
      const k = dayKey(cursor);
      const hit = map.get(k);
      out.push({ key: k, label: labelFor(cursor), orders: hit?.orders ?? 0, revenue: hit?.revenue ?? 0 });
      if (granularity === 'day') cursor.setDate(cursor.getDate() + 1);
      else if (granularity === 'week') cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [paidOrders, granularity]);

  const chartPeak = useMemo(() => {
    let best: { label: string; revenue: number } | null = null;
    for (const b of chartBuckets) {
      if (b.revenue > 0 && (!best || b.revenue > best.revenue)) best = { label: b.label, revenue: b.revenue };
    }
    return best;
  }, [chartBuckets]);

  return {
    todayOrders,
    periodOrders,
    granularity,
    chartBuckets,
    chartPeak,
    paidOrders,
    revenue,
    avgOrderValue,
    paidCount,
    cancelledCount,
    hourlyBuckets,
    maxHourlyRev,
    topProducts,
    staffStats,
    paymentMix,
    orderTypeSplit,
    liveOrders,
    peakHour,
    kitchenTickets,
  };
}
