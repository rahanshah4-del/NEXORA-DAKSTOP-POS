import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { IconBar } from '@/components/layout/IconBar';
import { TableSkeleton } from '@/screens/components/SkeletonLoader';
import { ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import { notifyInfo, notifyError } from '@/stores/toast-store';
import {
  ChefHat, ChevronDown, X, User, Clock, Bell, RotateCw,
  Check, AlertTriangle, Timer, Flame, Printer, Package as PackageIcon,
} from 'lucide-react';

// ── Types ──

interface KitchenOrder {
  orderNumber: string;
  orderType: string;
  table: string;
  orderStatus: string;
  paymentStatus: string;
  staffName: string;
  createdAt: string;
  cartRows: Array<{ itemId: string; itemName: string; itemPrice: number; qty: number; note: string }>;
  total: number;
}

const KITCHEN_STATUSES = ['pending', 'preparing', 'ready'] as const;
const FILTERS = ['All', 'Pending', 'Preparing', 'Ready'];
const AUTO_REFRESH_S = 18;

// ── Helpers ──

function elapsedMinutes(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function statusBadge(status: string): { label: string; dot: string; border: string } {
  switch (status) {
    case 'pending': return { label: 'New', dot: 'bg-amber-400', border: 'border-l-amber-400' };
    case 'preparing': return { label: 'Preparing', dot: 'bg-blue-500', border: 'border-l-blue-500' };
    case 'ready': return { label: 'Ready', dot: 'bg-emerald-400', border: 'border-l-emerald-400' };
    case 'served': return { label: 'Served', dot: 'bg-sky-400', border: 'border-l-sky-400' };
    case 'cancelled': return { label: 'Cancelled', dot: 'bg-red-400', border: 'border-l-red-400' };
    default: return { label: status, dot: 'bg-gray-400', border: 'border-l-gray-300' };
  }
}

const STATUS_FLOW: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'served',
};

const ADVANCE_LABEL: Record<string, string> = {
  pending: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Mark Served',
};

// ── Component ──

export default function Kitchen() {
  const kdsEnabled = useSettingsStore((s) => s.kdsEnabled);
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [advancing, setAdvancing] = useState<string | null>(null); // orderNumber currently advancing

  // ── Fetch ──

  const fetchOrders = useCallback(async () => {
    if (!wsId) return;
    setError(null);
    try {
      const result = await window.api.firestore.orders.list(wsId, { limit: 100 });
      if (!result.success) {
        setError(userFriendlyError(result.error, 'loading kitchen orders'));
        return;
      }
      const all = (result.orders ?? []) as KitchenOrder[];
      // Only show active kitchen orders (KITCHEN_STATUSES excludes served/cancelled;
      // a paid order that is still being cooked stays on the board).
      const active = all.filter((o) => KITCHEN_STATUSES.includes(o.orderStatus as any));
      setOrders(active);
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading kitchen orders'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(fetchOrders, AUTO_REFRESH_S * 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchOrders]);

  // ── Derived ──

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'All') return orders;
    const fs = activeFilter.toLowerCase();
    return orders.filter((o) => o.orderStatus === fs);
  }, [orders, activeFilter]);

  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.orderStatus === 'pending').length,
    preparing: orders.filter((o) => o.orderStatus === 'preparing').length,
    ready: orders.filter((o) => o.orderStatus === 'ready').length,
  }), [orders]);

  // ── Actions ──

  const advanceStatus = async (orderNumber: string) => {
    if (!wsId) return;
    const order = orders.find((o) => o.orderNumber === orderNumber);
    if (!order) return;
    const next = STATUS_FLOW[order.orderStatus];
    if (!next) return;

    setAdvancing(orderNumber);
    try {
      const result = await window.api.firestore.orders.updateStatus(wsId, orderNumber, next);
      if (!result.success) {
        throw new Error(userFriendlyError(result.error, 'updating order status'));
      }
      // Optimistically update local state
      setOrders((prev) =>
        prev.map((o) => (o.orderNumber === orderNumber ? { ...o, orderStatus: next } : o)),
      );
      // If advancing to served, remove from board after a brief moment
      if (next === 'served') {
        setTimeout(() => {
          setOrders((prev) => prev.filter((o) => o.orderNumber !== orderNumber));
          if (selectedOrder?.orderNumber === orderNumber) setSelectedOrder(null);
        }, 800);
      }
      // Update selected order if open
      if (selectedOrder?.orderNumber === orderNumber) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: next } : null));
      }
    } catch (err: any) {
      notifyError(userFriendlyError(err, 'advancing order status'));
      // Refresh from server to reconcile
      fetchOrders();
    } finally {
      setAdvancing(null);
    }
  };

  // ── Render ──

  const renderContent = () => {
    if (!wsId) {
      return <ScreenErrorState error="Not signed in — please log in again." />;
    }

    if (isLoading) {
      return (
        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-pos-card-border p-4 space-y-3 animate-pulse">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-100 rounded" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-gray-100 rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded" />
                  <div className="h-3 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error && orders.length === 0) {
      return <ScreenErrorState error={error} onRetry={fetchOrders} />;
    }

    return (
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-3">
          {/* Error banner when stale data exists */}
          {error && orders.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={fetchOrders} className="text-[10px] font-semibold underline hover:text-red-900">Retry</button>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-pos-muted text-sm">
              <div className="text-center">
                <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No active orders</p>
                <p className="text-[11px] mt-1">New orders placed through the POS will appear here automatically</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredOrders.map((order) => {
                const s = statusBadge(order.orderStatus);
                const isAdvancing = advancing === order.orderNumber;
                return (
                  <div
                    key={order.orderNumber}
                    onClick={() => setSelectedOrder(order)}
                    className={cn(
                      'rounded-lg border-2 border-l-4 shadow-sm cursor-pointer transition-all hover:shadow-md bg-white',
                      s.border,
                      isAdvancing && 'opacity-60 pointer-events-none',
                    )}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-pos-card-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-pos-ink">{order.orderNumber}</span>
                          <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full', s.dot, s.dot === 'bg-amber-400' ? 'text-amber-900' : 'text-white')}>
                            {s.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-pos-muted mt-0.5">
                          {order.table || order.orderType} &middot; {order.staffName || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-pos-muted flex items-center gap-1">
                          <Timer className="h-3 w-3" />{elapsedMinutes(order.createdAt)}
                        </p>
                        <p className="text-[9px] text-pos-muted">{fmtTime(order.createdAt)}</p>
                      </div>
                    </div>

                    <div className="px-3 py-2 space-y-1">
                      {(order.cartRows ?? []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px]">
                          <span className="flex-1">{item.itemName}</span>
                          <span className="font-semibold text-pos-muted shrink-0">×{item.qty}</span>
                          {item.note && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded shrink-0 max-w-[80px] truncate">{item.note}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-pos-card-border bg-pos-bar">
                      <button
                        onClick={(e) => { e.stopPropagation(); advanceStatus(order.orderNumber); }}
                        disabled={isAdvancing}
                        className="flex-1 h-7 text-[10px] font-semibold bg-pos-primary hover:bg-pos-primary-dark text-white rounded transition-colors disabled:opacity-50"
                      >
                        {isAdvancing ? '...' : ADVANCE_LABEL[order.orderStatus] || 'Next'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Side Panel ── */}
        {selectedOrder && (() => {
          const s = statusBadge(selectedOrder.orderStatus);
          const itemCount = (selectedOrder.cartRows ?? []).reduce((sum, i) => sum + i.qty, 0);
          return (
            <div className="w-[340px] bg-white border-l border-pos-card-border flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 h-[44px] bg-pos-primary">
                <div>
                  <h3 className="text-[12px] font-bold text-white">{selectedOrder.orderNumber}</h3>
                  <p className="text-[9px] text-white/70">{selectedOrder.table || selectedOrder.orderType} &middot; {selectedOrder.staffName}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-1 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-3">
                <div className="bg-pos-bar rounded-lg p-2.5 space-y-1 text-[10px]">
                  {[
                    { l: 'Status', v: s.label },
                    { l: 'Order Type', v: selectedOrder.orderType },
                    { l: 'Server', v: selectedOrder.staffName || 'Unknown' },
                    { l: 'Time', v: fmtTime(selectedOrder.createdAt) },
                    { l: 'Elapsed', v: elapsedMinutes(selectedOrder.createdAt) },
                    { l: 'Items', v: String(itemCount) },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between"><span className="text-pos-muted">{r.l}</span><span className="font-semibold">{r.v}</span></div>
                  ))}
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold text-pos-muted uppercase mb-2">Line Items</h4>
                  <div className="space-y-1">
                    {(selectedOrder.cartRows ?? []).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-pos-bar rounded text-[11px]">
                        <span className="flex-1">{item.itemName}</span>
                        {item.note && <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded">({item.note})</span>}
                        <span className="font-semibold">×{item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-pos-card-border space-y-1.5">
                {STATUS_FLOW[selectedOrder.orderStatus] && (
                  <button
                    onClick={() => advanceStatus(selectedOrder.orderNumber)}
                    className="w-full h-9 text-[11px] font-bold bg-pos-primary hover:bg-pos-primary-dark text-white rounded transition-colors"
                  >
                    {ADVANCE_LABEL[selectedOrder.orderStatus]}
                  </button>
                )}
                <button onClick={() => setSelectedOrder(null)} className="w-full h-8 text-[10px] font-medium border border-pos-card-border text-pos-muted rounded hover:bg-pos-bar transition-colors">
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // KDS disabled — redirect to home. Kept below ALL hooks so a mid-mount
  // kdsEnabled flip doesn't change the hook count and crash React.
  if (!kdsEnabled) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-rail">
        <header className="flex items-center h-[48px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0">
          <h1 className="text-[14px] font-bold text-pos-ink tracking-tight">Nexora Solution</h1>
          <span className="h-4 w-px bg-pos-card-border mx-2.5" />
          <span className="text-[11px] text-pos-muted font-medium">Kitchen Display</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag">
            <span className="text-[11px] text-pos-muted flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-pos-muted" />
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-pos-muted">
              <div className="h-6 w-6 rounded-full bg-pos-primary-soft flex items-center justify-center"><User className="h-3 w-3 text-pos-primary" /></div>
              Admin <ChevronDown className="h-3 w-3 text-pos-muted" />
            </div>
            <div className="flex items-center ml-1">
              <button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-pos-muted hover:bg-pos-ground rounded transition-colors">─</button>
              <button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-pos-muted hover:bg-pos-ground rounded transition-colors">□</button>
              <button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-white hover:bg-pos-cancel-fg rounded transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="flex items-center h-[44px] px-3 bg-pos-bar border-b border-pos-card-border shrink-0 gap-2">
          {FILTERS.map((f) => {
            const c = f === 'All' ? counts.all : f === 'Pending' ? counts.pending : f === 'Preparing' ? counts.preparing : counts.ready;
            return (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors flex items-center gap-1.5',
                  activeFilter === f ? 'bg-pos-primary text-white' : 'text-pos-muted hover:text-pos-ink hover:bg-pos-ground')}>
                {f}
                {c > 0 && <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', activeFilter === f ? 'bg-white/20' : 'bg-pos-card-border')}>{c}</span>}
              </button>
            );
          })}
          <div className="flex-1" />
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-pos-muted hover:text-pos-ink hover:bg-pos-ground rounded transition-colors disabled:opacity-50"
          >
            <RotateCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />Refresh
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-pos-muted rounded transition-colors hover:bg-pos-primary-soft hover:text-pos-primary"
            title="Print all active kitchen orders"
            onClick={() => {
              if (filteredOrders.length === 0) { notifyError('No active orders to print'); return; }
              const pw = useSettingsStore.getState().printerType === 'thermal58' ? 58 : 80;
              const boardOrders = filteredOrders.map((o) => ({
                orderNumber: o.orderNumber,
                orderType: o.orderType,
                table: o.table,
                orderStatus: o.orderStatus,
                elapsed: elapsedMinutes(o.createdAt),
                cartRows: (o.cartRows || []).map((r) => ({ itemName: r.itemName, qty: r.qty, note: r.note })),
              }));
              window.api.printer.printKitchenBoard(boardOrders as any, pw).then((pr: any) => {
                if (pr.success) notifyInfo('Kitchen board sent to printer (test mode — saved to print-jobs)');
                else notifyError(`Print failed: ${pr.error}`);
              }).catch((e: any) => notifyError(`Print error: ${e.message}`));
            }}
          >
            <Printer className="h-3 w-3" />Print All
          </button>
        </div>

        {renderContent()}

        <footer className="flex items-center justify-between h-[32px] px-3 bg-pos-deep shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-white/70">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pending: <span className="text-white font-semibold">{counts.pending}</span></span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Preparing: <span className="text-white font-semibold">{counts.preparing}</span></span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Ready: <span className="text-white font-semibold">{counts.ready}</span></span>
          </div>
          <div className="text-[9px] text-white/60">
            Active: <span className="text-white font-semibold">{counts.pending + counts.preparing + counts.ready}</span>/{counts.all}
            &nbsp;&middot;&nbsp;Auto-refresh: {AUTO_REFRESH_S}s
          </div>
        </footer>
      </div>
    </div>
  );
}
