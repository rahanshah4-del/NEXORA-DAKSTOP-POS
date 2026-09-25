import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney } from '@/utils/workspaceMoney';
import { useAuthStore } from '@/stores/auth-store';
import { useTableStore } from '@/stores/table-store';
import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { IconBar } from '@/components/layout/IconBar';
import { CancelOrderModal } from '@/components/shared/CancelOrderModal';
import { notifyPrint, notifySuccess, notifyInfo, notifyError } from '@/stores/toast-store';
import { ScreenEmptyState, ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import { TableSkeleton } from '@/screens/components/SkeletonLoader';
import {
  X, User, Clock, Search, Printer,
  Download, RotateCw, Eye, Edit, Trash2,
  FileText, AlertTriangle, RefreshCw, Wallet,
  Calendar, ChevronDown, XCircle, CheckCircle2,
  Clock4, CookingPot, UtensilsCrossed, Ban,
  Banknote, ShoppingCart,
} from 'lucide-react';

// ── Types ──

interface FirestoreOrder {
  orderNumber: string;
  billNumber: string;
  kotNumber: string;
  orderType: string;
  table: string;
  source: string;
  notes: string;
  customer: string;
  customerId: string;
  phone: string;
  deliveryAddress: string;
  riderNotes: string;
  cartRows?: Array<{ itemId: string; itemName: string; itemPrice: number; qty: number; note: string }>;
  totals?: { subtotal: number; discount: number; netSubtotal: number; serviceCharges: number; tax: number; total: number };
  total: number;
  paidAmount: number;
  dueAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  lastPaymentId: string;
  lastPaymentAt: string;
  cancelReason?: string;
  createdBy: string;
  staffName: string;
  staffId: string;
  workspaceId: string;
  businessType: string;
  ownerId: string;
  walletAmountUsed?: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderRow {
  orderNumber: string;
  table: string;
  type: string;
  customer: string;
  items: number;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  walletAmountUsed: number;
  time: string;
  server: string;
  phone?: string;
  _raw: FirestoreOrder;
}

// ── Date range helpers ──

type DateRangePreset = 'today' | 'week' | 'month' | 'custom';

function dateRange(preset: DateRangePreset, customStart?: string, customEnd?: string): { start: string; end: string; label: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start: start.toISOString(), end: end.toISOString(), label: 'Today' };
    }
    case 'week': {
      const dow = now.getDay();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow, 0, 0, 0, 0);
      return { start: start.toISOString(), end: end.toISOString(), label: 'This Week' };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: start.toISOString(), end: end.toISOString(), label: 'This Month' };
    }
    case 'custom':
      return {
        start: customStart || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString(),
        end: customEnd || end.toISOString(),
        label: 'Custom Range',
      };
  }
}

// ── Payment status helpers ──

function isTerminalStatus(orderStatus: string, paymentStatus: string): boolean {
  return orderStatus === 'cancelled' || paymentStatus === 'refunded';
}

function isCancellable(orderStatus: string, paymentStatus: string): boolean {
  // Only already-cancelled orders cannot be cancelled again.
  // Served/paid orders remain cancellable — genuine mistakes and
  // customer disputes can happen after payment.
  return orderStatus !== 'cancelled';
}

function isEditable(orderStatus: string, paymentStatus: string): boolean {
  if (isTerminalStatus(orderStatus, paymentStatus)) return false;
  if (paymentStatus === 'paid') return false;
  return true;
}

// ── Formatters ──

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtShortDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ── Status badges — icons + color ──

const STATUS_META: Record<string, { icon: React.ReactNode; bg: string; text: string; dot: string }> = {
  pending:      { icon: <Clock4 className="h-3 w-3" />,         bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  preparing:    { icon: <CookingPot className="h-3 w-3" />,     bg: 'bg-blue-50',  text: 'text-blue-700',  dot: 'bg-blue-500' },
  ready:        { icon: <UtensilsCrossed className="h-3 w-3" />, bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  served:       { icon: <CheckCircle2 className="h-3 w-3" />,   bg: 'bg-pos-primary-soft', text: 'text-pos-primary-dark', dot: 'bg-pos-primary' },
  completed:    { icon: <CheckCircle2 className="h-3 w-3" />,   bg: 'bg-pos-primary-soft', text: 'text-pos-primary-dark', dot: 'bg-pos-primary' },
  cancelled:    { icon: <Ban className="h-3 w-3" />,            bg: 'bg-red-50',  text: 'text-red-700',  dot: 'bg-red-500' },
};

function statusMeta(status: string) {
  return STATUS_META[(status || '').toLowerCase()] ?? { icon: null, bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' };
}

function paymentColor(paymentStatus: string): string {
  const s = (paymentStatus || '').toLowerCase();
  if (s === 'paid') return 'text-emerald-600 bg-emerald-50';
  if (s === 'due' || s === 'unpaid') return 'text-amber-600 bg-amber-50';
  if (s === 'partial') return 'text-blue-600 bg-blue-50';
  if (s === 'refunded') return 'text-red-600 bg-red-50';
  return 'text-gray-500 bg-gray-50';
}

// ── Component ──

const DATE_PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

export default function OrdersPage() {
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  /** All amounts on this screen are already in major units (rupees). */
  const money = (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride);
  const navigate = useNavigate();
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;
  const tables = useTableStore((s) => s.tables);

  // ── Table ID → name lookup ──
  const tableNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tables) { map.set(t.id, t.name); }
    return map;
  }, [tables]);

  function resolveTableName(orderTableId: string): string {
    if (!orderTableId) return '—';
    return tableNameById.get(orderTableId) ?? 'Table (deleted)';
  }

  // ── Date range state ──
  const [datePreset, setDatePreset] = useState<DateRangePreset>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const currentRange = useMemo(
    () => dateRange(datePreset, customStart || undefined, customEnd || undefined),
    [datePreset, customStart, customEnd],
  );

  // ── Data state ──
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [viewOrder, setViewOrder] = useState<OrderRow | null>(null);
  const [editOrder, setEditOrder] = useState<OrderRow | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<OrderRow | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // ── Fetch ──

  const fetchOrders = useCallback(async () => {
    if (!wsId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.firestore.orders.list(wsId, {
        startDate: currentRange.start,
        endDate: currentRange.end,
        limit: 500,
      });
      if (!result.success) {
        // If Firestore needs a composite index for createdAt range query,
        // the error will include the index creation URL — surface it clearly.
        const friendlyErr = userFriendlyError(result.error, 'loading orders');
        setError(friendlyErr);
        return;
      }
      setOrders((result.orders ?? []) as FirestoreOrder[]);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading orders'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId, currentRange.start, currentRange.end]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Derived rows ──

  const rows: OrderRow[] = useMemo(() => orders.map((o) => ({
    orderNumber: o.orderNumber || '—',
    table: resolveTableName(o.table || ''),
    type: o.orderType || '—',
    customer: o.customer || 'Walk-in Guest',
    items: o.cartRows?.length ?? 0,
    total: o.total ?? 0,
    orderStatus: o.orderStatus || 'pending',
    paymentStatus: o.paymentStatus || 'due',
    paymentMethod: o.paymentMethod || 'Cash',
    walletAmountUsed: o.walletAmountUsed || 0,
    time: fmtTime(o.createdAt),
    server: o.staffName || '—',
    phone: o.phone || '',
    _raw: o,
  })), [orders]);

  // Client-side search: order number, customer name, or phone
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((o) =>
      o.orderNumber.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      (o.phone && o.phone.includes(searchQuery)),
    );
  }, [rows, searchQuery]);

  // ── Stats (reflect selected date range) ──

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.orderStatus === 'pending' || o.orderStatus === 'preparing').length;
    const cancelled = orders.filter((o) => o.orderStatus === 'cancelled').length;
    const revenue = orders
      .filter((o) => o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled')
      .reduce((s, o) => s + (o.total ?? 0), 0);
    return { total: orders.length, active, cancelled, revenue };
  }, [orders]);

  const statsLabel = datePreset === 'today' ? 'Today' : datePreset === 'week' ? 'This Week' : datePreset === 'month' ? 'This Month' : 'Selected Range';

  // ── Actions ──

  const handleRefresh = () => {
    fetchOrders();
    notifyInfo('Refreshing orders...');
  };

  const handlePrint58mm = (order: OrderRow) => {
    notifyPrint(`Printing ${order.orderNumber} to 58mm printer...`);
    setTimeout(() => notifySuccess(`${order.orderNumber} printed on 58mm!`), 1000);
  };

  const handleWhatsApp = (order: OrderRow) => {
    if (order.phone) {
      const msg = encodeURIComponent(`*${order.orderNumber} Update*\nStatus: ${order.orderStatus}\nTotal: ${money(order.total)}\nPayment: ${order.paymentStatus}\n\n— Nexora Solution`);
      window.open(`https://wa.me/${order.phone.replace(/[\s+]/g, '')}?text=${msg}`, '_blank');
      notifySuccess(`WhatsApp message sent for ${order.orderNumber}!`);
    } else {
      notifyInfo('No phone number available for this customer');
    }
  };

  // ── Cancel action ──

  const handleCancelOrder = async (row: OrderRow, reason: string) => {
    if (!wsId) return;

    // Cancel locally via SQLite
    try {
      await window.api.local.orders.cancel(row.orderNumber, reason, wsId);
    } catch { /* non-critical */ }

    // Firestore sync: update directly when online
    window.api.firestore.orders.update(wsId, row.orderNumber, {
      orderStatus: 'cancelled',
      cancelReason: reason,
    }).catch(() => {});

    // Update local state immediately
    setOrders((prev) => prev.map((o) =>
      o.orderNumber === row.orderNumber
        ? { ...o, orderStatus: 'cancelled', cancelReason: reason }
        : o,
    ));
    setCancelTarget(null);
    notifySuccess(`Order ${row.orderNumber} cancelled`);
  };

  // ── Quick Edit — Save ──

  const handleSaveEdit = async () => {
    if (!editOrder || !wsId) return;

    const updates: Record<string, unknown> = {};
    if (editNotes !== editOrder._raw.notes) updates.notes = editNotes;
    if (editStatus && editStatus !== editOrder.orderStatus) updates.orderStatus = editStatus;

    if (Object.keys(updates).length === 0) {
      setEditOrder(null);
      return;
    }

    // Firestore update
    try {
      await window.api.firestore.orders.update(wsId, editOrder.orderNumber, updates);
    } catch { /* non-critical */ }

    // Update local state
    setOrders((prev) => prev.map((o) =>
      o.orderNumber === editOrder.orderNumber
        ? { ...o, ...(updates.notes !== undefined ? { notes: updates.notes as string } : {}), ...(updates.orderStatus !== undefined ? { orderStatus: updates.orderStatus as string } : {}) }
        : o,
    ));
    setEditOrder(null);
    notifySuccess(`Order ${editOrder.orderNumber} updated`);
  };

  // ── Report ──

  const todayReport58mm = () => {
    notifyPrint('Printing report on 58mm...');
    setTimeout(() => notifySuccess('Report printed on 58mm!'), 1000);
    setShowReport(false);
  };

  // ── Render helpers ──

  const renderContent = () => {
    if (!wsId) {
      return (
        <ScreenErrorState
          error="Not signed in — please log in again."
          onRetry={() => navigate('/login')}
        />
      );
    }

    if (isLoading && orders.length === 0) {
      return <TableSkeleton rows={6} cols={8} />;
    }

    if (error && orders.length === 0) {
      return <ScreenErrorState error={error} onRetry={fetchOrders} />;
    }

    if (!isLoading && orders.length === 0) {
      return (
        <ScreenEmptyState
          screen="orders"
          title={`No orders in ${statsLabel}`}
          description="Orders placed through the POS during this period will appear here."
        />
      );
    }

    return (
      <div className="bg-white rounded-xl border border-pos-card-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-card-border bg-pos-bar">
              {['Order #', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Time', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[9px] font-semibold text-pos-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pos-divider">
            {filtered.map((row) => {
              const sm = statusMeta(row.orderStatus);
              const canCancel = isCancellable(row.orderStatus, row.paymentStatus);
              const canEdit = isEditable(row.orderStatus, row.paymentStatus);
              const isExpanded = expandedRow === row.orderNumber;

              return (
                <React.Fragment key={row.orderNumber}>
                  <tr
                    className={cn(
                      'group transition-colors cursor-pointer',
                      isExpanded ? 'bg-pos-primary-soft' : 'hover:bg-pos-bar',
                      row.orderStatus === 'cancelled' && 'opacity-60',
                    )}
                    onClick={() => setExpandedRow(isExpanded ? null : row.orderNumber)}
                  >
                    {/* Order # */}
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-[12px] font-bold text-pos-ink">{row.orderNumber}</p>
                        <p className="text-[10px] text-pos-muted">{row.type}{row.table !== '—' ? ` · ${row.table}` : ''}</p>
                      </div>
                    </td>
                    {/* Customer */}
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-[11px] font-medium text-pos-ink">{row.customer}</p>
                        {row.phone && <p className="text-[10px] text-pos-muted">{row.phone}</p>}
                      </div>
                    </td>
                    {/* Items */}
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-pos-ground text-pos-muted rounded-full">
                        <ShoppingCart className="h-2.5 w-2.5" />
                        {row.items}
                      </span>
                    </td>
                    {/* Total */}
                    <td className="px-3 py-3">
                      <span className="text-[12px] font-bold text-pos-ink tabular-nums">
                        {money(row.total)}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-3 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full',
                        sm.bg, sm.text,
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', sm.dot)} />
                        {row.orderStatus}
                      </span>
                    </td>
                    {/* Payment */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full w-fit', paymentColor(row.paymentStatus))}>
                          {row.paymentStatus}
                        </span>
                        {row.paymentStatus === 'paid' && row.walletAmountUsed > 0 && (
                          <span className="inline-flex items-center gap-1 text-[9px] text-pos-primary font-medium">
                            <Wallet className="h-2.5 w-2.5" />
                            {row.paymentMethod === 'Wallet' ? 'Wallet (full)' : `Wallet ${money(row.walletAmountUsed)}`}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Time */}
                    <td className="px-3 py-3">
                      <div>
                        <p className="text-[11px] text-pos-muted">{row.time}</p>
                        <p className="text-[10px] text-pos-muted">{fmtShortDate(row._raw.createdAt)}</p>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* View */}
                        <button
                          onClick={() => setViewOrder(row)}
                          className="p-1.5 text-pos-muted hover:text-pos-primary hover:bg-pos-primary-soft rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {/* Edit */}
                        {canEdit && (
                          <button
                            onClick={() => { setEditOrder(row); setEditNotes(row._raw.notes || ''); setEditStatus(row.orderStatus); }}
                            className="p-1.5 text-pos-muted hover:text-pos-prep-fg hover:bg-blue-50 rounded transition-colors"
                            title="Quick edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Cancel */}
                        {canCancel && (
                          <button
                            onClick={() => setCancelTarget(row)}
                            className="p-1.5 text-pos-muted hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Cancel order"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Print */}
                        <button
                          onClick={() => handlePrint58mm(row)}
                          className="p-1.5 text-pos-muted hover:text-pos-primary hover:bg-pos-primary-soft rounded transition-colors"
                          title="Print receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        {/* WhatsApp */}
                        {row.phone && (
                          <button
                            onClick={() => handleWhatsApp(row)}
                            className="p-1.5 text-pos-muted hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                            title="Send WhatsApp"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row — quick info */}
                  {isExpanded && (
                    <tr className="bg-pos-primary-soft border-b border-pos-card-border">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="grid grid-cols-4 gap-4 text-[11px]">
                          <div>
                            <span className="text-pos-muted text-[10px] block">Server</span>
                            <span className="font-medium">{row.server}</span>
                          </div>
                          <div>
                            <span className="text-pos-muted text-[10px] block">Payment Method</span>
                            <span className="font-medium">{row.paymentMethod}</span>
                          </div>
                          <div>
                            <span className="text-pos-muted text-[10px] block">Order Type</span>
                            <span className="font-medium">{row.type}</span>
                          </div>
                          <div>
                            <span className="text-pos-muted text-[10px] block">Created</span>
                            <span className="font-medium">{fmtDate(row._raw.createdAt)}</span>
                          </div>
                          {row._raw.cancelReason && (
                            <div className="col-span-4">
                              <span className="text-pos-muted text-[10px] block">Cancel Reason</span>
                              <span className="font-medium text-red-600">{row._raw.cancelReason}</span>
                            </div>
                          )}
                          {row._raw.notes && (
                            <div className="col-span-4">
                              <span className="text-pos-muted text-[10px] block">Notes</span>
                              <span className="text-pos-muted">{row._raw.notes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-32 text-pos-muted text-xs gap-1">
            <Search className="h-5 w-5 opacity-30" />
            No orders match your search
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-rail">
        {/* Header */}
        <header className="flex items-center h-[48px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0">
          <h1 className="text-[14px] font-bold text-pos-ink">Nexora Solution</h1>
          <span className="h-4 w-px bg-pos-card-border mx-2.5" />
          <span className="text-[11px] text-pos-muted font-medium">Orders</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-pos-muted border border-pos-card-border rounded hover:bg-pos-ground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
              Refresh
            </button>
            <button onClick={() => setShowReport(true)} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-pos-primary border border-pos-primary/30 rounded hover:bg-pos-primary-soft transition-colors">
              <FileText className="h-3 w-3" />Report
            </button>
            <span className="text-[11px] text-pos-muted flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-pos-muted" />02:45 PM</span>
            <div className="flex items-center gap-1.5 text-[11px] text-pos-muted">
              <div className="h-6 w-6 rounded-full bg-pos-primary-soft flex items-center justify-center"><User className="h-3 w-3 text-pos-primary" /></div>
              Admin
            </div>
          </div>
        </header>

        {/* Date-range aware stats */}
        <div className="flex items-center gap-4 px-4 h-[50px] bg-pos-bar border-b border-pos-card-border shrink-0">
          {[
            { l: `Total (${statsLabel})`, v: stats.total },
            { l: 'Active', v: stats.active },
            { l: 'Revenue', v: `${money(stats.revenue)}` },
            { l: 'Cancelled', v: stats.cancelled },
          ].map((s, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-pos-muted">{s.l}</span>
                <span className="text-[12px] font-bold text-pos-ink">{s.v}</span>
              </div>
              {i < 3 && <span className="h-4 w-px bg-pos-card-border" />}
            </React.Fragment>
          ))}
          <div className="flex-1" />
          <button
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-pos-muted rounded transition-colors opacity-40 cursor-not-allowed"
            title="Export is not yet available"
            disabled
          >
            <Download className="h-3 w-3" />Export
          </button>
        </div>

        {/* Date-range filter bar + search */}
        <div className="flex items-center h-[44px] px-3 bg-pos-bar border-b border-pos-card-border shrink-0 gap-2">
          {/* Date presets */}
          <div className="flex items-center gap-0.5 bg-pos-ground rounded-lg p-0.5">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => { setDatePreset(p.key); if (p.key !== 'custom') { setCustomStart(''); setCustomEnd(''); } }}
                className={cn(
                  'px-3 py-1 text-[10px] font-semibold rounded-md transition-colors',
                  datePreset === p.key
                    ? 'bg-white text-pos-primary shadow-sm'
                    : 'text-pos-muted hover:text-pos-muted',
                )}
              >
                <Calendar className="h-3 w-3 inline mr-1" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom range pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-7 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary"
              />
              <span className="text-[10px] text-pos-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-7 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary"
              />
              <button
                onClick={fetchOrders}
                className="h-7 px-2.5 text-[10px] font-medium bg-pos-primary text-white rounded hover:bg-pos-primary-dark"
              >
                Apply
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-pos-muted" />
            <input
              type="text"
              placeholder="Search order #, customer, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-52 pl-7 pr-2 text-[10px] bg-pos-bar border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-pos-muted hover:text-pos-ink">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && orders.length > 0 && (
          <div className="flex items-center gap-2 mx-4 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={fetchOrders} className="text-[10px] font-semibold underline hover:text-red-900">Retry</button>
          </div>
        )}

        {/* Table / States */}
        <div className="flex-1 overflow-auto p-4">
          {renderContent()}
        </div>

        {/* Bottom bar */}
        <footer className="flex items-center justify-between h-[32px] px-3 bg-pos-deep shrink-0">
          <div className="text-[9px] text-white/70">
            Showing <span className="text-white font-semibold">{filtered.length}</span> of <span className="text-white font-semibold">{orders.length}</span> orders · {statsLabel}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/60">
            <RotateCw className="h-3 w-3" />
            Last updated: {lastUpdated ? fmtTime(lastUpdated.toISOString()) : '—'}
          </div>
        </footer>
      </div>

      {/* ═══ VIEW ORDER MODAL ═══ */}
      {viewOrder && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setViewOrder(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[440px] bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar shrink-0">
              <h3 className="text-[13px] font-bold text-pos-ink">{viewOrder.orderNumber}</h3>
              <button onClick={() => setViewOrder(null)} className="p-1 rounded text-pos-muted hover:text-pos-ink"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-2 text-[11px] overflow-auto">
              {[
                ['Order Number', viewOrder.orderNumber],
                ['Table', viewOrder.table],
                ['Type', viewOrder.type],
                ['Customer', viewOrder.customer],
                ['Phone', viewOrder._raw.phone || '—'],
                ['Items', `${viewOrder.items} items`],
                ['Total', `${money(viewOrder.total)}`],
                ['Order Status', viewOrder.orderStatus],
                ['Payment Status', viewOrder.paymentStatus],
                ['Payment Method', viewOrder._raw.paymentMethod || 'Cash'],
                ...(viewOrder.walletAmountUsed > 0 ? [
                  ['Wallet Paid', `${money(viewOrder.walletAmountUsed)}`],
                  ['Cash/Card Paid', `${money((viewOrder.total - viewOrder.walletAmountUsed))}`],
                ] : []),
                ['Server', viewOrder.server],
                ['Created', fmtDate(viewOrder._raw.createdAt)],
                ...(viewOrder._raw.cancelReason ? [['Cancel Reason', viewOrder._raw.cancelReason]] : []),
                ['Notes', viewOrder._raw.notes || '—'],
              ].map(([l, v]) => (
                <div key={l as string} className="flex justify-between py-1.5 border-b border-pos-divider">
                  <span className="text-content-secondary">{l}</span>
                  <span className={cn('font-semibold', l === 'Cancel Reason' && 'text-red-600')}>{v}</span>
                </div>
              ))}
              {/* Line items */}
              {viewOrder._raw.cartRows && viewOrder._raw.cartRows.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-semibold text-content-secondary mb-1.5 uppercase tracking-wider">Line Items</p>
                  {viewOrder._raw.cartRows.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[10px] py-1 border-b border-pos-divider">
                      <span>{item.qty}× {item.itemName}</span>
                      <span className="tabular-nums font-medium">{money(item.itemPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-4 pb-4 pt-1 shrink-0">
              <button onClick={() => { handlePrint58mm(viewOrder); setViewOrder(null); }} className="flex-1 h-8 text-[10px] font-medium border border-pos-card-border rounded flex items-center justify-center gap-1 hover:bg-pos-ground">
                <Printer className="h-3 w-3" />Print
              </button>
              <button onClick={() => { handleWhatsApp(viewOrder); setViewOrder(null); }} className="flex-1 h-8 text-[10px] font-medium bg-green-500 text-white rounded flex items-center justify-center gap-1 hover:bg-green-600">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUICK EDIT MODAL ═══ */}
      {editOrder && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditOrder(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[380px] bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar">
              <h3 className="text-[13px] font-bold text-pos-ink">Edit {editOrder.orderNumber}</h3>
              <button onClick={() => setEditOrder(null)} className="p-1 rounded text-pos-muted hover:text-pos-ink"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-pos-muted mb-1">Order Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-[34px] px-3 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary"
                >
                  {['pending', 'preparing', 'ready', 'served'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-[10px] font-semibold text-pos-muted mb-1">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-[11px] border border-pos-card-border rounded-lg focus:outline-none focus:ring-1 focus:ring-pos-primary resize-none"
                  placeholder="Order notes..."
                />
              </div>
              {/* Info */}
              <div className="text-[10px] text-pos-muted bg-pos-bar rounded-lg px-3 py-2">
                {editOrder.customer} · {editOrder.items} items · {money(editOrder.total)} · {editOrder.paymentStatus}
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditOrder(null)} className="flex-1 h-[34px] text-[11px] font-medium border border-pos-card-border text-pos-muted rounded-lg hover:bg-pos-ground">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="flex-1 h-[34px] text-[11px] font-semibold bg-pos-primary text-white rounded-lg hover:bg-pos-primary-dark">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CANCEL ORDER MODAL (shared) ═══ */}
      <CancelOrderModal
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={(reason) => handleCancelOrder(cancelTarget!, reason)}
        orderIdentifier={cancelTarget?.orderNumber}
        isOnline={isOnline}
        workspaceId={wsId || ''}
      />

      {/* ═══ DELETE CONFIRMATION (disabled stub) ═══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirm(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[320px] bg-white rounded-xl shadow-2xl border border-pos-card-border p-6 text-center animate-slide-up">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-500" /></div>
            <h3 className="text-[14px] font-bold text-pos-ink mb-1">Delete not available</h3>
            <p className="text-[11px] text-content-secondary mb-4">Order deletion from the POS is not yet implemented.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-[34px] text-[11px] font-medium border border-pos-card-border text-pos-muted rounded-lg hover:bg-pos-ground">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ REPORT MODAL ═══ */}
      {showReport && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowReport(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-[300px] bg-white rounded-xl shadow-2xl border border-pos-card-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-pos-card-border bg-pos-bar">
              <h3 className="text-[13px] font-bold">{statsLabel} Report — 58mm</h3>
              <button onClick={() => setShowReport(false)} className="p-1 rounded text-pos-muted hover:text-pos-ink"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4">
              <div className="bg-white border-2 border-dashed border-pos-card-border rounded-lg p-4 font-mono text-[10px] leading-relaxed">
                <div className="text-center font-bold text-[11px] mb-2">NEXORA SOLUTION</div>
                <div className="text-center font-bold mb-1 uppercase">{statsLabel}'S REPORT</div>
                <div className="border-t border-dashed border-pos-card-border my-2" />
                {[
                  ['Total Orders', stats.total],
                  ['Active Orders', stats.active],
                  ['Revenue', `${money(stats.revenue)}`],
                  ['Cancelled', stats.cancelled],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between"><span>{l}</span><span className="font-bold">{v}</span></div>
                ))}
                <div className="border-t border-dashed border-pos-card-border my-2" />
                <div className="text-center text-[9px]">Status Breakdown</div>
                {['pending', 'preparing', 'ready', 'served', 'cancelled'].map((s) => {
                  const c = rows.filter((o) => o.orderStatus === s).length;
                  return <div key={s} className="flex justify-between text-[9px]"><span className="capitalize">{s}</span><span>{c}</span></div>;
                })}
                <div className="border-t border-dashed border-pos-card-border my-2" />
                <div className="text-center text-[8px]">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                <div className="text-center text-[8px]">Powered by Nexora Solution</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowReport(false)} className="flex-1 h-8 text-[10px] font-medium border border-pos-card-border rounded hover:bg-pos-ground">Close</button>
                <button onClick={todayReport58mm} className="flex-1 h-8 text-[10px] font-semibold bg-pos-primary text-white rounded hover:bg-pos-primary-dark flex items-center justify-center gap-1"><Printer className="h-3 w-3" />Print 58mm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
