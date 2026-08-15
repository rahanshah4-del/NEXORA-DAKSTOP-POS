/**
 * PaymentsScreen — Firestore-backed payment processing.
 *
 * Features:
 *   - Record Payment: form to log a payment against an order (amount, method, tip)
 *   - Payments List: log view with filters (order, date range)
 *   - Refund / status update capability
 */
import React, { useEffect, useState, useMemo } from 'react';
import { usePayments } from '@/hooks/firestore/usePayments';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { ScreenEmptyState } from '../components/ScreenStates';
import { TableSkeleton } from '../components/SkeletonLoader';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { formatCurrency } from '@/utils/formatters';
import { useCurrencySymbol } from '@/hooks/useCurrency';
import {
  Plus,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  Check,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

// ── Constants ──

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'credit', label: 'Credit' },
];

const METHOD_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-3.5 h-3.5" />,
  card: <CreditCard className="w-3.5 h-3.5" />,
  upi: <Smartphone className="w-3.5 h-3.5" />,
  wallet: <CreditCard className="w-3.5 h-3.5" />,
  credit: <CreditCard className="w-3.5 h-3.5" />,
};

// ── Helpers ──

function fmtTs(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );
}

// ── Component ──

export const PaymentsScreen: React.FC = () => {
  const {
    payments,
    isLoading,
    error,
    recordPayment,
    fetchPayments,
    updatePayment,
    clearError,
  } = usePayments();

  const currSymbol = useCurrencySymbol();

  // ── Modals ──
  const [showRecord, setShowRecord] = useState(false);
  const [refundTarget, setRefundTarget] = useState<string | null>(null);

  // ── Record form ──
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [tip, setTip] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // ── Filters ──
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // ── Load on mount ──
  useEffect(() => {
    fetchPayments({ limit: 100 });
  }, []);

  // ── Totals ──
  const totals = useMemo(() => {
    const totalAmount = payments.reduce((s, p) => s + (p.amountCents ?? 0), 0);
    const totalTips = payments.reduce((s, p) => s + (p.tipCents ?? 0), 0);
    return { totalAmount, totalTips };
  }, [payments]);

  // ── Handlers ──
  const handleRecord = async () => {
    const amtCents = Math.round(Number(amount) * 100);
    const tipCents = Math.round(Number(tip) * 100);
    if (!orderId.trim()) {
      notifyError('Enter an order ID.');
      return;
    }
    if (amtCents <= 0) {
      notifyError('Enter a valid amount.');
      return;
    }
    const id = await recordPayment({
      orderId: orderId.trim(),
      amountCents: amtCents,
      method,
      tipCents: tipCents > 0 ? tipCents : undefined,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (id) {
      notifySuccess('Payment recorded.');
      setShowRecord(false);
      resetRecordForm();
      fetchPayments({ limit: 100 });
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    const ok = await updatePayment(refundTarget, {
      status: 'refunded',
    });
    if (ok) {
      notifySuccess('Payment refunded.');
      setRefundTarget(null);
    }
  };

  const handleApplyFilters = () => {
    fetchPayments({
      orderId: filterOrderId.trim() || undefined,
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      limit: 100,
    });
  };

  const resetRecordForm = () => {
    setOrderId('');
    setAmount('');
    setMethod('cash');
    setTip('');
    setReference('');
    setNotes('');
  };

  const clearFilters = () => {
    setFilterOrderId('');
    setFilterStartDate('');
    setFilterEndDate('');
    fetchPayments({ limit: 100 });
  };

  // ── Render ──
  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Payment management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Payments</h1>
          <p className="text-sm text-content-secondary mt-0.5">
            Record and manage order payments.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPayments({ limit: 100 })}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetRecordForm();
              setShowRecord(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-danger">Error</p>
            <p className="text-xs text-danger/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-xs text-danger/60 hover:text-danger shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding="lg">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <Receipt className="w-3.5 h-3.5" />
            Total Payments
          </div>
          <p className="text-lg font-bold text-content">
            {currSymbol}
            {(totals.totalAmount / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-content-tertiary mt-0.5">
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Total Tips
          </div>
          <p className="text-lg font-bold text-success">
            {currSymbol}
            {(totals.totalTips / 100).toLocaleString('en-IN')}
          </p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <RotateCcw className="w-3.5 h-3.5" />
            Refunded
          </div>
          <p className="text-lg font-bold text-warning">
            {payments.filter((p) => p.status === 'refunded').length}
          </p>
        </Card>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-40">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-tertiary" />
          <input
            type="text"
            value={filterOrderId}
            onChange={(e) => setFilterOrderId(e.target.value)}
            placeholder="Order ID..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
          />
        </div>
        <Input
          label=""
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          wrapperClassName="w-36"
        />
        <Input
          label=""
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          wrapperClassName="w-36"
        />
        <Button size="sm" variant="secondary" onClick={handleApplyFilters}>
          Apply
        </Button>
        {(filterOrderId || filterStartDate || filterEndDate) && (
          <Button size="sm" variant="ghost" onClick={clearFilters} leftIcon={<X className="w-3 h-3" />}>
            Clear
          </Button>
        )}
      </div>

      {/* ═══ Payments Table ═══ */}
      {isLoading && !payments.length ? (
        <TableSkeleton />
      ) : payments.length === 0 ? (
        <ScreenEmptyState
          screen="orders"
          title="No payments yet"
          description="Record your first payment to see it here."
          action="Record Payment"
          onAction={() => setShowRecord(true)}
        />
      ) : (
        <Table
          columns={[
            {
              key: 'time',
              header: 'Time',
              accessor: (p) => (
                <span className="text-xs whitespace-nowrap">{fmtTs(p.createdAt)}</span>
              ),
            },
            {
              key: 'orderId',
              header: 'Order',
              accessor: (p) => (
                <span className="text-xs font-mono font-medium">{p.orderId}</span>
              ),
            },
            {
              key: 'method',
              header: 'Method',
              accessor: (p) => (
                <span className="flex items-center gap-1 text-xs">
                  {METHOD_ICONS[p.method] ?? null}
                  {p.method.charAt(0).toUpperCase() + p.method.slice(1)}
                </span>
              ),
            },
            {
              key: 'amountCents',
              header: 'Amount',
              accessor: (p) => (
                <span className="text-xs font-semibold">
                  {currSymbol}
                  {((p.amountCents ?? 0) / 100).toLocaleString('en-IN')}
                </span>
              ),
            },
            {
              key: 'tipCents',
              header: 'Tip',
              accessor: (p) =>
                (p.tipCents ?? 0) > 0 ? (
                  <span className="text-xs text-success">
                    {currSymbol}
                    {((p.tipCents ?? 0) / 100).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span className="text-xs text-content-tertiary">—</span>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              accessor: (p) => (
                <Badge
                  size="sm"
                  variant={
                    p.status === 'paid'
                      ? 'success'
                      : p.status === 'refunded'
                        ? 'warning'
                        : p.status === 'voided'
                          ? 'danger'
                          : 'default'
                  }
                  dot
                >
                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </Badge>
              ),
            },
            {
              key: 'reference',
              header: 'Ref',
              accessor: (p) =>
                p.reference ? (
                  <span className="text-xs font-mono text-content-secondary">
                    {p.reference}
                  </span>
                ) : (
                  <span className="text-xs text-content-tertiary">—</span>
                ),
            },
            {
              key: 'actions',
              header: '',
              accessor: (p) =>
                p.status === 'paid' ? (
                  <button
                    onClick={() => setRefundTarget(p.id ?? '')}
                    className="p-1.5 text-content-tertiary hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                    title="Refund"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                ) : null,
            },
          ]}
          data={payments}
          keyExtractor={(p) => p.id ?? ''}
        />
      )}

      {/* ═══ RECORD PAYMENT MODAL ═══ */}
      <Modal
        open={showRecord}
        onClose={() => setShowRecord(false)}
        title="Record Payment"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowRecord(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecord}
              isLoading={isLoading}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Record Payment
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. #1047"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 299.99"
            />
            <Select
              label="Method"
              options={PAYMENT_METHODS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Tip (₹, optional)"
              type="number"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="e.g. 50"
            />
            <Input
              label="Reference (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TXN123"
            />
          </div>
          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any remarks..."
          />
        </div>
      </Modal>

      {/* ═══ REFUND CONFIRMATION ═══ */}
      <ConfirmationDialog
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        title="Refund Payment"
        message="Are you sure you want to refund this payment? This action cannot be undone."
        confirmLabel="Yes, Refund"
        variant="warning"
      />
    </div>
  );
};
