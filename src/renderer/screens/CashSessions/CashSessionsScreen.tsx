/**
 * CashSessionsScreen — Firestore-backed cash register management.
 *
 * Features:
 *   - Open Register: form to open a new cash session (opening balance)
 *   - Active Session banner: shown when a session is open (real-time via listener)
 *   - Close Register: expected vs counted cash + closing balance input
 *   - Session History: list of past sessions (open/close times, balances)
 */
import React, { useEffect, useState } from 'react';
import { useCashSessions } from '@/hooks/firestore/useCashSessions';
import { useAuthStore } from '@/stores/auth-store';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { ScreenEmptyState, ScreenErrorState } from '../components/ScreenStates';
import { TableSkeleton } from '../components/SkeletonLoader';
import { formatCurrency } from '@/utils/formatters';
import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney, getWorkspaceSymbol } from '@/utils/workspaceMoney';
import {
  Plus,
  Lock,
  Clock,
  User,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  History,
  RefreshCw,
  Check,
} from 'lucide-react';

// ── Helpers ──

function fmtTs(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) +
    ' ' +
    d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
}

function fmtShortTs(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Component ──

export const CashSessionsScreen: React.FC = () => {
  const {
    activeSession,
    sessions,
    isLoading,
    error,
    openSession,
    closeSession,
    refreshActive,
    fetchHistory,
    clearError,
  } = useCashSessions();

  const staffProfile = useAuthStore((s) => s.staffProfile);
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  /** Bare symbol, for input labels like "Amount (Rs)". */
  const currSymbol = getWorkspaceSymbol(currencyCode, currencyOverride);
  /** Amounts already in major units (rupees). */
  const money = (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride);
  /** Amounts stored in paise/cents by the Firestore schema. */
  const moneyFromCents = (cents: number) => money((cents ?? 0) / 100);

  // ── Modals ──
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);

  // ── Open form ──
  const [openingBalance, setOpeningBalance] = useState('5000');
  const [openNotes, setOpenNotes] = useState('');

  // ── Close form ──
  const [expectedBalance, setExpectedBalance] = useState('');
  const [countedBalance, setCountedBalance] = useState('');
  const [difference, setDifference] = useState(0);

  // ── Load history on mount ──
  useEffect(() => {
    fetchHistory({ limit: 50 });
  }, []);

  // ── Auto-calc difference on close ──
  useEffect(() => {
    const expected = Number(expectedBalance) || 0;
    const counted = Number(countedBalance) || 0;
    setDifference(counted - expected);
  }, [expectedBalance, countedBalance]);

  // ── Handlers ──
  const handleOpen = async () => {
    const cents = Math.round(Number(openingBalance) * 100);
    if (cents <= 0) {
      notifyError('Enter a valid opening balance.');
      return;
    }
    const id = await openSession(cents, openNotes || undefined);
    if (id) {
      notifySuccess('Register opened.');
      setOpenModalOpen(false);
      setOpeningBalance('5000');
      setOpenNotes('');
    }
  };

  const handleClose = async () => {
    if (!activeSession?.id) return;
    const counted = Math.round(Number(countedBalance) * 100);
    const expected = Math.round(Number(expectedBalance) * 100);
    if (counted <= 0 || expected <= 0) {
      notifyError('Enter valid balance amounts.');
      return;
    }
    const ok = await closeSession({
      closingBalanceCents: counted,
      expectedBalanceCents: expected,
      differenceCents: counted - expected,
    });
    if (ok) {
      notifySuccess('Register closed.');
      setCloseModalOpen(false);
      setExpectedBalance('');
      setCountedBalance('');
      fetchHistory({ limit: 50 });
    }
  };

  // ── Pre-fill close form from active session ──
  const openCloseModal = () => {
    if (activeSession) {
      const opening = (activeSession.openingBalanceCents ?? 0) / 100;
      setExpectedBalance(String(opening));
      setCountedBalance('');
    }
    setCloseModalOpen(true);
  };

  // ── Render ──
  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Cash register management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Cash Register</h1>
          <p className="text-sm text-content-secondary mt-0.5">
            {activeSession
              ? 'Register is open — close it at end of shift.'
              : 'No active register — open one to start accepting cash.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refreshActive(); fetchHistory({ limit: 50 }); }}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          {activeSession ? (
            <Button
              variant="danger"
              size="sm"
              onClick={openCloseModal}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Close Register
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setOpenModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Open Register
            </Button>
          )}
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

      {/* ═══ Active Session Banner ═══ */}
      {activeSession && (
        <Card padding="lg" className="border-success/30 bg-success/[0.02]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-content">Register Open</p>
                <p className="text-xs text-content-secondary mt-0.5">
                  Opened {fmtTs(activeSession.openedAt)} by {activeSession.openedByName}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-content-tertiary uppercase tracking-wider">Opening Balance</p>
              <p className="text-xl font-bold text-success">
                {moneyFromCents(activeSession.openingBalanceCents ?? 0)}
              </p>
            </div>
          </div>
          {activeSession.notes && (
            <p className="mt-3 pt-3 border-t border-border text-xs text-content-secondary">
              Notes: {activeSession.notes}
            </p>
          )}
        </Card>
      )}

      {/* ═══ Session History ═══ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-content-secondary" />
          <h2 className="text-sm font-semibold text-content">Session History</h2>
        </div>

        {isLoading && !sessions.length ? (
          <TableSkeleton />
        ) : sessions.length === 0 ? (
          <ScreenEmptyState
            screen="orders"
            title="No session history"
            description="Past cash sessions will appear here."
          />
        ) : (
          <Table
            columns={[
              {
                key: 'openedAt',
                header: 'Opened',
                accessor: (r) => (
                  <span className="text-xs">{fmtTs(r.openedAt)}</span>
                ),
              },
              {
                key: 'closedAt',
                header: 'Closed',
                accessor: (r) => (
                  <span className="text-xs">
                    {r.closedAt ? fmtShortTs(r.closedAt) : '—'}
                  </span>
                ),
              },
              {
                key: 'openedBy',
                header: 'Opened By',
                accessor: (r) => (
                  <span className="text-xs font-medium">{r.openedByName}</span>
                ),
              },
              {
                key: 'openingBalance',
                header: 'Opening',
                accessor: (r) => (
                  <span className="text-xs font-semibold">
                    {moneyFromCents(r.openingBalanceCents ?? 0)}
                  </span>
                ),
              },
              {
                key: 'closingBalance',
                header: 'Closing',
                accessor: (r) =>
                  r.closingBalanceCents != null ? (
                    <span className="text-xs font-semibold">
                      {moneyFromCents(r.closingBalanceCents)}
                    </span>
                  ) : (
                    <span className="text-xs text-content-tertiary">—</span>
                  ),
              },
              {
                key: 'difference',
                header: 'Diff',
                accessor: (r) =>
                  r.differenceCents != null ? (
                    <span
                      className={`text-xs font-semibold ${
                        r.differenceCents === 0
                          ? 'text-success'
                          : r.differenceCents > 0
                            ? 'text-warning'
                            : 'text-danger'
                      }`}
                    >
                      {r.differenceCents > 0 ? '+' : ''}
                      {moneyFromCents(r.differenceCents)}
                    </span>
                  ) : (
                    <span className="text-xs text-content-tertiary">—</span>
                  ),
              },
              {
                key: 'status',
                header: 'Status',
                accessor: (r) => (
                  <Badge
                    size="sm"
                    variant={r.status === 'open' ? 'success' : 'default'}
                    dot
                  >
                    {r.status === 'open' ? 'Open' : 'Closed'}
                  </Badge>
                ),
              },
            ]}
            data={sessions}
            keyExtractor={(r) => r.id ?? ''}
          />
        )}
      </div>

      {/* ═══ OPEN REGISTER MODAL ═══ */}
      <Modal
        open={openModalOpen}
        onClose={() => setOpenModalOpen(false)}
        title="Open Cash Register"
        description="Set an opening balance to begin the cash session."
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setOpenModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleOpen}
              isLoading={isLoading}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Open Register
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={`Opening Balance (${currSymbol})`}
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            placeholder="e.g. 5000"
            autoFocus
          />
          <Input
            label="Notes (optional)"
            value={openNotes}
            onChange={(e) => setOpenNotes(e.target.value)}
            placeholder="Any remarks..."
          />
        </div>
      </Modal>

      {/* ═══ CLOSE REGISTER MODAL ═══ */}
      <Modal
        open={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Close Cash Register"
        description="Enter the counted cash and compare with expected."
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setCloseModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleClose}
              isLoading={isLoading}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Close Register
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`Expected Balance (${currSymbol})`}
              type="number"
              value={expectedBalance}
              onChange={(e) => setExpectedBalance(e.target.value)}
              placeholder="e.g. 5000"
            />
            <Input
              label={`Counted Cash (${currSymbol})`}
              type="number"
              value={countedBalance}
              onChange={(e) => setCountedBalance(e.target.value)}
              placeholder="What's in the drawer?"
              autoFocus
            />
          </div>

          {/* Difference preview */}
          {(Number(countedBalance) || Number(expectedBalance)) && (
            <div
              className={`rounded-xl p-4 border ${
                difference === 0
                  ? 'bg-success/5 border-success/20'
                  : difference > 0
                    ? 'bg-warning/5 border-warning/20'
                    : 'bg-danger/5 border-danger/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-secondary">
                  Difference
                </span>
                <span
                  className={`text-lg font-bold ${
                    difference === 0
                      ? 'text-success'
                      : difference > 0
                        ? 'text-warning'
                        : 'text-danger'
                  }`}
                >
                  {difference > 0 ? '+' : ''}
                  {money(difference)}
                </span>
              </div>
              <p className="text-[10px] text-content-tertiary mt-1">
                {difference === 0
                  ? 'Perfect — cash matches expected!'
                  : difference > 0
                    ? 'Cash is over — there is extra money in the drawer.'
                    : 'Cash is short — money is missing from the drawer.'}
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
