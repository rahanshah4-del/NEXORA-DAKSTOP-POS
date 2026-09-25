import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney, formatMoneyPrintable, getResolvedWorkspaceCurrency } from '@/utils/workspaceMoney';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatsCard } from '@/components/shared/StatsCard';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { TableSkeleton } from '@/screens/components/SkeletonLoader';
import { ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import { notifySuccess, notifyInfo, notifyError } from '@/stores/toast-store';
import {
  Download, Printer, Search, Calendar, IndianRupee, ShoppingCart, BarChart3,
  TrendingUp, Package as PackageIcon, Users, ChefHat, FileText,
  CreditCard, Ticket, Clock, Tag, Receipt,
  RotateCw, User, Check, X, AlertTriangle, Wallet,
} from 'lucide-react';

// ── Types ──

interface FsCartRow { itemId: string; itemName: string; itemPrice: number; qty: number; note: string; }
interface FirestoreOrder {
  orderNumber: string; orderType: string; table: string; customer: string;
  cartRows?: FsCartRow[]; total: number; paidAmount: number; dueAmount: number;
  orderStatus: string; paymentStatus: string; paymentMethod: string;
  walletAmountUsed?: number;
  staffName: string; staffId: string;
  totals?: { subtotal: number; discount: number; netSubtotal: number; serviceCharges: number; tax: number; total: number };
  createdAt: string; updatedAt: string;
}

type DateRange = 'today' | '7d' | '30d' | 'month';

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'month', label: 'This Month' },
];

// ── Helpers ──

function getRangeDates(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;
  switch (range) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case '7d':
      start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
  }
  return { start, end };
}

function fmtDate(iso: string): string {
  // Date-only strings ("YYYY-MM-DD") parse as UTC midnight and shift a day in
  // negative-offset zones — force local midnight instead.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function csvEscape(v: unknown): string {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = [headers.map(csvEscape).join(','), ...rows.map((r) => r.map(csvEscape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Module-scope print helper (shared by every sub-report's Print button).
function handlePrintReport(title: string, columns: [string, number][], rows: string[][], summary?: [string, string][], dateLabel?: string) {
  // Outside a component — read the store snapshot rather than the hook.
  const resolvedCurrency = getResolvedWorkspaceCurrency();
  const data = {
    title,
    subtitle: dateLabel,
    // Resolved workspace currency, so printed reports match the screen.
    currency: resolvedCurrency.currencyCode,
    currencySymbol: resolvedCurrency.currencySymbol,
    columns,
    rows,
    summary,
    restaurantName: useSettingsStore.getState().restaurantName,
  };
  const pw = useSettingsStore.getState().printerType === 'thermal58' ? 58 : 80;
  window.api.printer.printReport(data as any, pw).then((pr: any) => {
    if (pr.success) notifyInfo('Report sent to printer (test mode — saved to print-jobs)');
    else notifyError(`Print failed: ${pr.error}`);
  }).catch((e: any) => notifyError(`Print error: ${e.message}`));
}

// ── Unavailable Report ──

const UnavailableReport: React.FC<{ title: string; reason: string }> = ({ title, reason }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 ring-1 ring-amber-200">
      <AlertTriangle className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
    </div>
    <h3 className="text-sm font-semibold text-content mb-1">{title}</h3>
    <p className="text-xs text-content-secondary max-w-md">{reason}</p>
  </div>
);

// ── Sub-Reports ──

/** Formats an amount as workspace currency, e.g. "Rs 12,500". */
type MoneyFn = (amount: number) => string;

interface ReportProps {
  orders: FirestoreOrder[];
  /** Screen formatting, e.g. "Rs 12,500" (may contain non-ASCII glyphs). */
  money: MoneyFn;
  /** Receipt formatting — guaranteed ASCII, e.g. "INR 12,500". */
  printMoney: MoneyFn;
  dateLabel: string;
}

// ---- Sales Report ----

function SalesReport({ orders, money, printMoney, dateLabel }: ReportProps) {
  const paid = useMemo(() => orders.filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled'), [orders]);
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const walletRevenue = paid.reduce((s, o) => s + (o.walletAmountUsed || 0), 0);
  const walletOrderCount = paid.filter((o) => (o.walletAmountUsed || 0) > 0).length;
  const totalTax = paid.reduce((s, o) => s + (o.totals?.tax ?? 0), 0);
  const totalOrd = orders.length;
  const avgOrd = paid.length > 0 ? Math.round(revenue / paid.length) : 0;

  const daily = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number; cgst: number; sgst: number; total: number }>();
    for (const o of paid) {
      const d = o.createdAt ? o.createdAt.slice(0, 10) : 'unknown';
      const prev = map.get(d) || { orders: 0, revenue: 0, cgst: 0, sgst: 0, total: 0 };
      const tax = o.totals?.tax ?? 0;
      map.set(d, {
        orders: prev.orders + 1,
        revenue: prev.revenue + o.total,
        cgst: prev.cgst + Math.round(tax / 2),
        sgst: prev.sgst + Math.round(tax / 2),
        total: prev.total + o.total,
      });
    }
    return Array.from(map.entries())
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [paid]);

  const exportCsv = () => {
    downloadCSV(
      `sales-report-${dateLabel}.csv`,
      ['Date', 'Orders', 'Revenue', 'CGST', 'SGST', 'Total'],
      daily.map((r) => [r.date, String(r.orders), String(r.revenue), String(r.cgst), String(r.sgst), String(r.total)]),
    );
    notifySuccess('Report exported as CSV');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Gross Revenue" value={`${money(revenue)}`} icon={IndianRupee} iconColor="text-success" />
        <StatsCard title="Total Orders" value={totalOrd} icon={ShoppingCart} iconColor="text-primary" />
        <StatsCard title="Wallet Revenue" value={walletRevenue > 0 ? `${money(walletRevenue)}` : '—'} icon={Wallet} iconColor="text-pos-primary" subtitle={walletOrderCount > 0 ? `${walletOrderCount} wallet order${walletOrderCount !== 1 ? 's' : ''}` : undefined} />
        <StatsCard title="Avg. Order Value" value={avgOrd > 0 ? `${money(avgOrd)}` : '—'} icon={TrendingUp} iconColor="text-info" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Daily Sales Breakdown — {dateLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
              handlePrintReport('Sales Report',
                [['Date', 30], ['Orders', 12], ['Revenue', 28], ['Tax', 30]],
                daily.map((r) => [r.date, String(r.orders), `${printMoney(r.revenue)}`, `${printMoney(r.total - r.revenue)}`]),
                [[`Total: ${daily.length} days`, `${printMoney(revenue)}`]],
              );
            }}>Print</Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={daily.length === 0}>Export CSV</Button>
          </div>
        </CardHeader>
        {daily.length === 0 ? (
          <EmptyState icon={BarChart3} title="No sales data" description="No paid orders in this period" />
        ) : (
          <Table
            columns={[
              { key: 'date', header: 'Date', accessor: (r: typeof daily[0]) => <span className="text-xs font-medium">{fmtDate(r.date)}</span> },
              { key: 'orders', header: 'Orders', accessor: (r) => <span className="text-xs font-semibold">{r.orders}</span> },
              { key: 'revenue', header: 'Revenue', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.revenue)}</span> },
              { key: 'cgst', header: 'CGST', accessor: (r) => <span className="text-xs tabular-nums">{money(r.cgst)}</span> },
              { key: 'sgst', header: 'SGST', accessor: (r) => <span className="text-xs tabular-nums">{money(r.sgst)}</span> },
              { key: 'total', header: 'Total', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.total)}</span> },
            ]}
            data={daily}
            keyExtractor={(r) => r.date}
            emptyState={<EmptyState icon={BarChart3} title="No sales data" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Today's Report ----

function TodaysReport({ orders, money, printMoney }: ReportProps) {
  const paid = orders.filter((o) => o.paymentStatus === 'paid');
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const dineIn = orders.filter((o) => o.orderType === 'Dine-in').length;
  const takeaway = orders.filter((o) => o.orderType === 'Takeaway').length;
  const delivery = orders.filter((o) => o.orderType === 'Delivery').length;
  const avg = orders.length > 0 ? Math.round(revenue / orders.length) : 0;

  // Payment breakdown for paid orders
  const walletRevenue = paid.reduce((s, o) => s + (o.walletAmountUsed || 0), 0);
  const cashCardRevenue = revenue - walletRevenue;

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt || '',
    time: o.createdAt ? fmtTime(o.createdAt) : '—',
    table: o.table || '—',
    type: o.orderType || '—',
    items: o.cartRows?.length ?? 0,
    amount: o.total,
    walletAmountUsed: o.walletAmountUsed || 0,
    status: o.orderStatus,
  })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Today's Revenue" value={`${money(revenue)}`} icon={IndianRupee} iconColor="text-success" />
        <StatsCard title="Total Orders" value={orders.length} icon={ShoppingCart} iconColor="text-primary" />
        <StatsCard title="Dine-in / T.Away / Del." value={`${dineIn} / ${takeaway} / ${delivery}`} icon={Users} iconColor="text-info" />
        <StatsCard title="Avg. Order" value={avg > 0 ? `${money(avg)}` : '—'} icon={TrendingUp} iconColor="text-primary" />
      </div>

      {/* Payment Method Breakdown */}
      {paid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-4 gap-4 px-1">
            <div className="text-center p-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CreditCard className="h-4 w-4 text-pos-muted" />
              </div>
              <p className="text-[10px] text-content-tertiary">Cash / Card</p>
              <p className="text-sm font-bold text-content">{money(cashCardRevenue)}</p>
            </div>
            <div className="text-center p-2">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wallet className="h-4 w-4 text-pos-primary" />
              </div>
              <p className="text-[10px] text-content-tertiary">Wallet</p>
              <p className="text-sm font-bold text-pos-primary">{money(walletRevenue)}</p>
            </div>
            <div className="text-center p-2">
              <p className="text-[10px] text-content-tertiary">Total Revenue</p>
              <p className="text-sm font-bold text-content">{money(revenue)}</p>
            </div>
            <div className="text-center p-2">
              <p className="text-[10px] text-content-tertiary">Wallet Orders</p>
              <p className="text-sm font-bold text-pos-primary">{paid.filter((o) => (o.walletAmountUsed || 0) > 0).length}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Today's Orders — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('Todays Report',
              [['Order #', 18], ['Time', 14], ['Type', 14], ['Items', 8], ['Amount', 20], ['Wallet', 14], ['Status', 12]],
              rows.map((r: any) => [r.orderNumber, r.time, r.type, String(r.items), `${printMoney(r.amount)}`, r.walletAmountUsed > 0 ? `${printMoney(r.walletAmountUsed)}` : '—', r.status]),
              [['Total Revenue', `${printMoney(revenue)}`], ['Wallet Revenue', `${printMoney(walletRevenue)}`]],
            );
          }}>Print</Button>
        </CardHeader>
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders today" description="Orders will appear here as they come in" />
        ) : (
          <Table
            columns={[
              { key: 'orderNumber', header: 'Order #', accessor: (r: typeof rows[0]) => <span className="text-xs font-semibold text-primary">{r.orderNumber}</span> },
              { key: 'time', header: 'Time', accessor: (r) => <span className="text-xs">{r.time}</span> },
              { key: 'table', header: 'Table', accessor: (r) => <span className="text-xs">{r.table}</span> },
              { key: 'type', header: 'Type', accessor: (r) => <Badge size="sm">{r.type}</Badge> },
              { key: 'items', header: 'Items', accessor: (r) => <span className="text-xs font-semibold">{r.items}</span> },
              { key: 'amount', header: 'Amount', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.amount)}</span> },
              { key: 'status', header: 'Status', accessor: (r) => (
                <Badge size="sm" variant={r.status === 'served' ? 'success' : r.status === 'cancelled' ? 'danger' : r.status === 'preparing' ? 'warning' : 'info'}>{r.status}</Badge>
              )},
              { key: 'wallet', header: 'Wallet', accessor: (r) => (
                r.walletAmountUsed > 0
                  ? <span className="inline-flex items-center gap-1 text-[9px] text-pos-primary font-medium"><Wallet className="h-2.5 w-2.5" />{money(r.walletAmountUsed)}</span>
                  : <span className="text-[10px] text-content-tertiary">—</span>
              )},
            ]}
            data={rows}
            keyExtractor={(r) => r.orderNumber}
            emptyState={<EmptyState icon={ShoppingCart} title="No orders today" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Items Report ----

function ItemsReport({ orders, money, printMoney }: ReportProps) {
  const items = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const o of orders) {
      for (const row of o.cartRows ?? []) {
        const key = row.itemName || 'Unknown';
        const prev = map.get(key) || { qty: 0, revenue: 0 };
        map.set(key, { qty: prev.qty + (row.qty ?? 0), revenue: prev.revenue + (row.qty ?? 0) * (row.itemPrice ?? 0) });
      }
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, qty: d.qty, revenue: d.revenue, price: d.qty > 0 ? Math.round(d.revenue / d.qty) : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  const totalSold = items.reduce((s, i) => s + i.qty, 0);
  const totalRev = items.reduce((s, i) => s + i.revenue, 0);

  const exportCsv = () => {
    downloadCSV('items-report.csv', ['Item', 'Qty Sold', 'Avg Price', 'Revenue'], items.map((r) => [r.name, String(r.qty), String(r.price), String(r.revenue)]));
    notifySuccess('Report exported as CSV');
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatsCard title="Total Items Sold" value={totalSold.toLocaleString('en-PK')} icon={PackageIcon} iconColor="text-primary" />
        <StatsCard title="Total Revenue" value={`${money(totalRev)}`} icon={IndianRupee} iconColor="text-success" />
        <StatsCard title="Unique Items" value={items.length} icon={FileText} iconColor="text-info" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Item-wise Sales</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
              handlePrintReport('Items Report',
                [['Item', 40], ['Qty Sold', 15], ['Revenue', 25], ['% of Total', 20]],
                items.map((i: any) => [i.name, String(i.qty), `${printMoney(i.revenue)}`, i.percentage || '—']),
                [['Total Sold', String(totalSold)], ['Total Revenue', `${printMoney(totalRev)}`]],
              );
            }}>Print</Button>
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv} disabled={items.length === 0}>Export CSV</Button>
          </div>
        </CardHeader>
        {items.length === 0 ? (
          <EmptyState icon={PackageIcon} title="No items data" description="Orders with line items will appear here" />
        ) : (
          <Table
            columns={[
              { key: 'name', header: 'Item', accessor: (r: typeof items[0]) => <span className="text-xs font-medium">{r.name}</span> },
              { key: 'qty', header: 'Sold', accessor: (r) => <span className="text-xs font-semibold">{r.qty}</span> },
              { key: 'price', header: 'Avg Price', accessor: (r) => <span className="text-xs tabular-nums">{money(r.price)}</span> },
              { key: 'revenue', header: 'Revenue', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.revenue)}</span> },
            ]}
            data={items}
            keyExtractor={(r) => r.name}
            emptyState={<EmptyState icon={PackageIcon} title="No items data" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Payment Report ----

function PaymentReport({ orders, money, printMoney }: ReportProps) {
  const paymentRows = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const o of orders) {
      if (o.paymentStatus !== 'paid' || o.orderStatus === 'cancelled') continue;
      const method = o.paymentMethod || 'Other';
      const prev = map.get(method) || { count: 0, amount: 0 };
      map.set(method, { count: prev.count + 1, amount: prev.amount + o.total });
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);
    return Array.from(map.entries())
      .map(([method, d]) => ({ method, count: d.count, amount: d.amount, percentage: total > 0 ? `${((d.amount / total) * 100).toFixed(1)}%` : '0%' }))
      .sort((a, b) => b.amount - a.amount);
  }, [orders]);

  const total = paymentRows.reduce((s, p) => s + p.amount, 0);
  const totalTxns = paymentRows.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Total Collections" value={`${money(total)}`} icon={IndianRupee} iconColor="text-success" />
        <StatsCard title="Total Transactions" value={totalTxns.toLocaleString('en-PK')} icon={CreditCard} iconColor="text-primary" />
        <StatsCard title="Payment Methods" value={paymentRows.length} icon={FileText} iconColor="text-warning" />
        <StatsCard title="Top Method" value={paymentRows[0]?.method ?? '—'} icon={CreditCard} iconColor="text-info" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Payment Method Breakdown</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('Payment Report',
              [['Method', 35], ['Orders', 15], ['Total', 25], ['Avg', 25]],
              paymentRows.map((r: any) => [r.method, String(r.count), `${printMoney(r.amount)}`, `${printMoney((r.count > 0 ? Math.round(r.amount / r.count) : 0))}`]),
              [['Total Collections', `${printMoney(total)}`], ['Transactions', String(totalTxns)]],
            );
          }}>Print</Button>
        </CardHeader>
        {paymentRows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No payment data" description="Paid orders will appear here" />
        ) : (
          <Table
            columns={[
              { key: 'method', header: 'Method', accessor: (r: typeof paymentRows[0]) => <span className="text-xs font-semibold">{r.method}</span> },
              { key: 'count', header: 'Transactions', accessor: (r) => <span className="text-xs">{r.count}</span> },
              { key: 'amount', header: 'Amount', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.amount)}</span> },
              { key: 'percentage', header: 'Share', accessor: (r) => (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: r.percentage }} />
                  </div>
                  <span className="text-xs">{r.percentage}</span>
                </div>
              )},
            ]}
            data={paymentRows}
            keyExtractor={(r) => r.method}
            emptyState={<EmptyState icon={CreditCard} title="No payment data" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Order Report ----

function OrderReport({ orders, money, printMoney }: ReportProps) {
  const completed = orders.filter((o) => o.orderStatus === 'served').length;
  const cancelled = orders.filter((o) => o.orderStatus === 'cancelled').length;
  const pending = orders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing').length;

  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    createdAt: o.createdAt || '',
    time: o.createdAt ? fmtTime(o.createdAt) : '—',
    table: o.table || '—',
    type: o.orderType || '—',
    items: o.cartRows?.length ?? 0,
    amount: o.total,
    customer: o.customer,
    paymentMethod: o.paymentMethod,
    status: o.orderStatus,
    payment: o.paymentStatus,
  })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Total Orders" value={orders.length} icon={ShoppingCart} iconColor="text-primary" />
        <StatsCard title="Served" value={completed} subtitle={orders.length > 0 ? `${((completed / orders.length) * 100).toFixed(0)}%` : '—'} icon={Check} iconColor="text-success" />
        <StatsCard title="Cancelled" value={cancelled} subtitle={orders.length > 0 ? `${((cancelled / orders.length) * 100).toFixed(0)}%` : '—'} icon={X} iconColor="text-danger" />
        <StatsCard title="Pending/Preparing" value={pending} icon={RotateCw} iconColor="text-warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('Order Report',
              [['Order #', 16], ['Type', 14], ['Status', 12], ['Customer', 22], ['Items', 8], ['Total', 16], ['Method', 12]],
              rows.map((r: any) => [r.orderNumber, r.type, r.status, r.customer, String(r.items), `${printMoney(r.amount)}`, r.paymentMethod || '—']),
              [['Total', `${printMoney(orders.reduce((s: number, o: any) => s + (o.total || 0), 0))}`], ['Served', String(completed)], ['Cancelled', String(cancelled)]],
            );
          }}>Print</Button>
        </CardHeader>
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No orders" description="Orders will appear here" />
        ) : (
          <Table
            columns={[
              { key: 'orderNumber', header: 'Order #', accessor: (r: typeof rows[0]) => <span className="text-xs font-semibold text-primary">{r.orderNumber}</span> },
              { key: 'time', header: 'Time', accessor: (r) => <span className="text-xs">{r.time}</span> },
              { key: 'table', header: 'Table', accessor: (r) => <span className="text-xs">{r.table}</span> },
              { key: 'type', header: 'Type', accessor: (r) => <Badge size="sm">{r.type}</Badge> },
              { key: 'items', header: 'Items', accessor: (r) => <span className="text-xs font-semibold">{r.items}</span> },
              { key: 'amount', header: 'Amount', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.amount)}</span> },
              { key: 'status', header: 'Status', accessor: (r) => <Badge size="sm" variant={r.status === 'served' ? 'success' : r.status === 'cancelled' ? 'danger' : 'info'}>{r.status}</Badge> },
              { key: 'payment', header: 'Payment', accessor: (r) => <span className="text-xs">{r.payment}</span> },
            ]}
            data={rows}
            keyExtractor={(r) => r.orderNumber}
            emptyState={<EmptyState icon={ShoppingCart} title="No orders" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- KOT Report ----

function KOTReport({ orders, money, printMoney }: ReportProps) {
  const rows = useMemo(() => orders.map((o) => ({
    kotNo: o.orderNumber,
    orderNo: o.orderNumber,
    createdAt: o.createdAt || '',
    time: o.createdAt ? fmtTime(o.createdAt) : '—',
    table: o.table || o.orderType || '—',
    type: o.orderType || '—',
    items: o.cartRows?.length ?? 0,
    amount: o.total,
    status: o.orderStatus,
    elapsed: o.createdAt ? fmtElapsed(o.createdAt) : '—',
  })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')), [orders]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="Total Orders Today" value={orders.length} icon={Receipt} iconColor="text-primary" />
        <StatsCard title="Pending" value={orders.filter((o) => o.orderStatus === 'pending').length} icon={Clock} iconColor="text-warning" />
        <StatsCard title="Preparing" value={orders.filter((o) => o.orderStatus === 'preparing').length} icon={ChefHat} iconColor="text-info" />
        <StatsCard title="Ready/Served" value={orders.filter((o) => o.orderStatus === 'ready' || o.orderStatus === 'served').length} icon={Check} iconColor="text-success" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>KOT History</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('KOT Report',
              [['Order #', 16], ['Time', 14], ['Type', 12], ['Table', 14], ['Items', 8], ['Total', 18], ['Status', 18]],
              rows.map((r: any) => [r.kotNo, r.time, r.type, r.table, String(r.items), `${printMoney(r.amount)}`, r.status]),
              [['Total KOTs', String(rows.length)], ['Pending', String(orders.filter((o: any) => o.orderStatus === 'pending').length)]],
            );
          }}>Print All</Button>
        </CardHeader>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No KOTs" description="Orders will appear here" />
        ) : (
          <Table
            columns={[
              { key: 'kotNo', header: 'Order #', accessor: (r: typeof rows[0]) => <span className="text-xs font-semibold text-primary">{r.kotNo}</span> },
              { key: 'time', header: 'Time', accessor: (r) => <span className="text-xs">{r.time}</span> },
              { key: 'table', header: 'Table', accessor: (r) => <span className="text-xs">{r.table}</span> },
              { key: 'items', header: 'Items', accessor: (r) => <span className="text-xs font-semibold">{r.items}</span> },
              { key: 'status', header: 'Status', accessor: (r) => (
                <Badge size="sm" variant={r.status === 'served' ? 'success' : r.status === 'preparing' ? 'warning' : r.status === 'pending' ? 'warning' : 'info'}>{r.status}</Badge>
              )},
            ]}
            data={rows}
            keyExtractor={(r) => r.kotNo}
            emptyState={<EmptyState icon={Receipt} title="No KOTs" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Shift Report ----

function ShiftReport({ orders, money, printMoney }: ReportProps) {
  const staffRows = useMemo(() => {
    const map = new Map<string, { orders: number; sales: number }>();
    for (const o of orders) {
      const key = o.staffName || 'Unknown';
      const prev = map.get(key) || { orders: 0, sales: 0 };
      map.set(key, { orders: prev.orders + 1, sales: prev.sales + o.total });
    }
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, orders: d.orders, sales: d.sales }))
      .sort((a, b) => b.sales - a.sales);
  }, [orders]);

  const totalOrders = staffRows.reduce((s, r) => s + r.orders, 0);
  const activeStaff = staffRows.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatsCard title="Active Staff Today" value={activeStaff} icon={Users} iconColor="text-primary" />
        <StatsCard title="Total Orders Served" value={totalOrders} icon={ShoppingCart} iconColor="text-success" />
        <StatsCard title="Total Sales" value={`${money(staffRows.reduce((s, r) => s + r.sales, 0))}`} icon={IndianRupee} iconColor="text-warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('Staff Report',
              [['Staff', 35], ['Orders', 15], ['Sales', 25], ['Shift', 25]],
              staffRows.map((r: any) => [r.name, String(r.orders), `${printMoney(r.sales)}`, '—']),
              [['Active Staff', String(activeStaff)], ['Total Orders', String(totalOrders)]],
            );
          }}>Print</Button>
        </CardHeader>
        {staffRows.length === 0 ? (
          <EmptyState icon={Users} title="No staff data" description="Orders with staff attribution will appear here" />
        ) : (
          <Table
            columns={[
              { key: 'name', header: 'Staff', accessor: (r: typeof staffRows[0]) => (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">{r.name.charAt(0)}</span>
                  </div>
                  <span className="text-xs font-medium text-content">{r.name}</span>
                </div>
              )},
              { key: 'orders', header: 'Orders', accessor: (r) => <span className="text-xs font-semibold">{r.orders}</span> },
              { key: 'sales', header: 'Sales', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.sales)}</span> },
            ]}
            data={staffRows}
            keyExtractor={(r) => r.name}
            emptyState={<EmptyState icon={Users} title="No shift data" />}
          />
        )}
      </Card>
    </div>
  );
}

// ---- Category Report (limited — cross-references menu store) ----

function CategoryReport({ orders, money, printMoney }: ReportProps) {
  const menuItems = useMenuStore((s) => s.items);
  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const mi of menuItems) {
      if (mi.name && mi.category) map.set(mi.name.toLowerCase(), mi.category);
    }
    return map;
  }, [menuItems]);

  const categoryRows = useMemo(() => {
    const map = new Map<string, { items: Set<string>; orders: Set<string>; revenue: number }>();
    for (const o of orders) {
      for (const row of o.cartRows ?? []) {
        const cat = itemCategoryMap.get((row.itemName || '').toLowerCase()) || 'Uncategorized';
        const prev = map.get(cat) || { items: new Set<string>(), orders: new Set<string>(), revenue: 0 };
        prev.items.add(row.itemName);
        prev.orders.add(o.orderNumber);
        prev.revenue += (row.qty ?? 0) * (row.itemPrice ?? 0);
        map.set(cat, prev);
      }
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v.revenue, 0);
    return Array.from(map.entries())
      .map(([category, d]) => ({
        category,
        items: d.items.size,
        orderCount: d.orders.size,
        revenue: d.revenue,
        percentage: total > 0 ? `${((d.revenue / total) * 100).toFixed(0)}%` : '0%',
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, itemCategoryMap]);

  if (menuItems.length === 0) {
    return <UnavailableReport title="Category-wise Report" reason="Menu items are not loaded. Categories are cross-referenced from the menu — load menu data first. Consider adding a 'category' field to the order's cartRows schema for reliable category reporting." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryRows.map((c) => (
          <Card key={c.category} padding="lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-content">{c.category}</p>
                <p className="text-xs text-content-secondary mt-0.5">{c.items} items &middot; {c.orderCount} orders</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-content tabular-nums">{money(c.revenue)}</p>
                <Badge size="sm" variant="primary">{c.percentage}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Category-wise Sales Table</CardTitle>
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => {
            handlePrintReport('Category Report',
              [['Category', 40], ['Orders', 15], ['Revenue', 25], ['% of Total', 20]],
              categoryRows.map((r: any) => [r.category, String(r.orderCount), `${printMoney(r.revenue)}`, r.percentage || '—']),
              [['Total Categories', String(categoryRows.length)]],
            );
          }}>Print</Button>
        </CardHeader>
        {categoryRows.length === 0 ? (
          <EmptyState icon={Tag} title="No category data" description="No matching categories found for order items in this period" />
        ) : (
          <Table
            columns={[
              { key: 'category', header: 'Category', accessor: (r: typeof categoryRows[0]) => <span className="text-xs font-semibold">{r.category}</span> },
              { key: 'items', header: 'Items', accessor: (r) => <span className="text-xs">{r.items}</span> },
              { key: 'orderCount', header: 'Orders', accessor: (r) => <span className="text-xs font-semibold">{r.orderCount}</span> },
              { key: 'revenue', header: 'Revenue', accessor: (r) => <span className="text-xs font-semibold tabular-nums">{money(r.revenue)}</span> },
              { key: 'percentage', header: 'Share', accessor: (r) => <Badge size="sm">{r.percentage}</Badge> },
            ]}
            data={categoryRows}
            keyExtractor={(r) => r.category}
            emptyState={<EmptyState icon={Tag} title="No category data" />}
          />
        )}
      </Card>
    </div>
  );
}

// ── Report Definitions ──

const reportTypes = [
  { id: 'sales', label: 'Sales Report', icon: IndianRupee },
  { id: 'today', label: 'Todays Report', icon: Calendar },
  { id: 'items', label: 'Items Report', icon: PackageIcon },
  { id: 'payment', label: 'Payment Report', icon: CreditCard },
  { id: 'order', label: 'Order Report', icon: ShoppingCart },
  { id: 'category', label: 'Category-wise Report', icon: Tag },
  { id: 'kitchen', label: 'Kitchen Dept. wise Report', icon: ChefHat },
  { id: 'kot', label: 'KOT Report', icon: Receipt },
  { id: 'coupon', label: 'Coupon History', icon: Ticket },
  { id: 'shift', label: 'User Shift Report', icon: User },
];

// ── Main Component ──

export default function Reports() {
  // One hook call for the page; sub-reports receive the formatter as a prop.
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  const money = useCallback(
    (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride),
    [currencyCode, currencyOverride],
  );
  // Printed rows must be pure ASCII — the ESC/POS builder writes with
  // Buffer.from(s, 'ascii') and silently corrupts anything else.
  const printMoney = useCallback(
    (amount: number) => formatMoneyPrintable(amount, currencyCode, currencyOverride),
    [currencyCode, currencyOverride],
  );
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;

  const [activeReport, setActiveReport] = useState('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('7d');

  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!wsId) return;
    setIsLoading(true);
    setError(null);
    try {
      const range = getRangeDates(dateRange);
      const result = await window.api.firestore.orders.list(wsId, {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      });
      if (!result.success) {
        setError(userFriendlyError(result.error, 'loading reports'));
        return;
      }
      setOrders((result.orders ?? []) as FirestoreOrder[]);
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading reports'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId, dateRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reportTypes;
    return reportTypes.filter((r) => r.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const dateLabel = DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'Last 7 Days';

  const renderReport = () => {
    if (!wsId) return <ScreenErrorState error="Not signed in — please log in again." />;

    if (isLoading) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-6 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <TableSkeleton rows={5} cols={6} />
        </div>
      );
    }

    if (error && orders.length === 0) {
      return <ScreenErrorState error={error} onRetry={fetchOrders} />;
    }

    const props: ReportProps = { orders, money, printMoney, dateLabel };

    switch (activeReport) {
      case 'sales': return <SalesReport {...props} />;
      case 'today': return <TodaysReport {...props} />;
      case 'items': return <ItemsReport {...props} />;
      case 'payment': return <PaymentReport {...props} />;
      case 'order': return <OrderReport {...props} />;
      case 'category': return <CategoryReport {...props} />;
      case 'kitchen':
        return <UnavailableReport title="Kitchen Dept. wise Report" reason="Kitchen department tracking is not implemented yet. The POS doesn't assign items to kitchen departments — this would require a department field on menu items or cartRows." />;
      case 'kot': return <KOTReport {...props} />;
      case 'coupon':
        return <UnavailableReport title="Coupon History" reason="The desktop POS doesn't have a coupon/discount code system. Coupons are not being collected and cannot be reported on." />;
      case 'shift': return <ShiftReport {...props} />;
      default: return <SalesReport {...props} />;
    }
  };

  const activeLabel = reportTypes.find((r) => r.id === activeReport)?.label ?? 'Report';

  return (
    <PageContainer padding="lg">
      <PageHeader
        title="Reports"
        description={`${dateLabel} — ${orders.length} orders`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              options={DATE_RANGE_OPTIONS}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
            />
            <Button variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} disabled title="Global export is not yet available">
              Export
            </Button>
          </div>
        }
      />

      {/* Error banner when stale data */}
      {error && orders.length > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchOrders} className="text-[10px] font-semibold underline hover:text-red-900">Retry</button>
        </div>
      )}

      <div className="flex gap-5">
        {/* Sidebar */}
        <Card className="w-56 shrink-0 self-start" padding="none">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-tertiary" />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full h-[30px] pl-7 pr-2 text-[11px] bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <nav className="py-1">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                  activeReport === report.id
                    ? 'bg-surface-tertiary text-content border-r-2 border-primary'
                    : 'text-content-secondary hover:text-content hover:bg-surface-tertiary',
                )}
              >
                <report.icon className="h-4 w-4 shrink-0" />
                <span className="text-[11px] font-medium leading-tight">{report.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Report Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-content">{activeLabel}</h2>
          </div>
          {renderReport()}
        </div>
      </div>
    </PageContainer>
  );
}
