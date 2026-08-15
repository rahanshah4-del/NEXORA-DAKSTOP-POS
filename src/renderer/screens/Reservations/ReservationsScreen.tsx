/**
 * ReservationsScreen — Firestore-backed table reservation management.
 *
 * Features:
 *   - Reservation list view (today's reservations, filterable by date)
 *   - New Reservation form (customer name, party size, date, time)
 *   - Edit/update capability (party size, time, status, table)
 *   - Cancel capability
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useReservations } from '@/hooks/firestore/useReservations';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { ScreenEmptyState } from '../components/ScreenStates';
import { TableSkeleton } from '../components/SkeletonLoader';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useCurrencySymbol } from '@/hooks/useCurrency';
import {
  Plus,
  Calendar,
  Users,
  Clock,
  Phone,
  Mail,
  RefreshCw,
  Edit,
  XCircle,
  Check,
  AlertTriangle,
  Search,
  X,
} from 'lucide-react';

// ── Constants ──

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'seated', label: 'Seated' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no-show', label: 'No-show' },
];

const RESERVATION_STATUSES = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'seated', label: 'Seated' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no-show', label: 'No-show' },
];

// ── Helpers ──

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

// ── Component ──

export const ReservationsScreen: React.FC = () => {
  const {
    reservations,
    isLoading,
    error,
    createReservation,
    fetchReservations,
    updateReservation,
    cancelReservation,
    clearError,
  } = useReservations();

  const currSymbol = useCurrencySymbol();

  // ── Modals ──
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // reservation id
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // ── Filters ──
  const [filterDate, setFilterDate] = useState(todayStr());
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  // ── Form state ──
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPartySize, setFormPartySize] = useState('2');
  const [formDate, setFormDate] = useState(todayStr());
  const [formTime, setFormTime] = useState('19:00');
  const [formTableId, setFormTableId] = useState('');
  const [formTableName, setFormTableName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('confirmed');

  // ── Load on mount ──
  useEffect(() => {
    fetchReservations({ date: filterDate, limit: 100 });
  }, []);

  // ── Filtered reservations ──
  const filtered = useMemo(() => {
    if (activeStatusTab === 'all') return reservations;
    return reservations.filter((r) => r.status === activeStatusTab);
  }, [reservations, activeStatusTab]);

  // ── Counts ──
  const counts = useMemo(() => {
    const confirmed = reservations.filter((r) => r.status === 'confirmed').length;
    const seated = reservations.filter((r) => r.status === 'seated').length;
    const cancelled = reservations.filter(
      (r) => r.status === 'cancelled' || r.status === 'no-show',
    ).length;
    return { confirmed, seated, cancelled };
  }, [reservations]);

  // ── Form helpers ──
  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPartySize('2');
    setFormDate(todayStr());
    setFormTime('19:00');
    setFormTableId('');
    setFormTableName('');
    setFormNotes('');
    setFormStatus('confirmed');
  };

  const populateFormForEdit = (res: any) => {
    setFormName(res.customerName ?? '');
    setFormPhone(res.customerPhone ?? '');
    setFormEmail(res.customerEmail ?? '');
    setFormPartySize(String(res.partySize ?? 2));
    setFormDate(res.date ?? todayStr());
    setFormTime(res.time ?? '19:00');
    setFormTableId(res.tableId ?? '');
    setFormTableName(res.tableName ?? '');
    setFormNotes(res.notes ?? '');
    setFormStatus(res.status ?? 'confirmed');
  };

  // ── Handlers ──
  const handleCreate = async () => {
    if (!formName.trim()) {
      notifyError('Customer name is required.');
      return;
    }
    const party = Number(formPartySize);
    if (party <= 0) {
      notifyError('Party size must be at least 1.');
      return;
    }
    const id = await createReservation({
      customerName: formName.trim(),
      customerPhone: formPhone.trim() || undefined,
      customerEmail: formEmail.trim() || undefined,
      partySize: party,
      date: formDate,
      time: formTime,
      tableId: formTableId.trim() || undefined,
      tableName: formTableName.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });
    if (id) {
      notifySuccess('Reservation created.');
      setShowNew(false);
      resetForm();
      fetchReservations({ date: filterDate, limit: 100 });
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const party = Number(formPartySize);
    if (party <= 0) {
      notifyError('Party size must be at least 1.');
      return;
    }
    const ok = await updateReservation(editing, {
      customerName: formName.trim(),
      customerPhone: formPhone.trim() || undefined,
      customerEmail: formEmail.trim() || undefined,
      partySize: party,
      date: formDate,
      time: formTime,
      status: formStatus as any,
      tableId: formTableId.trim() || undefined,
      tableName: formTableName.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });
    if (ok) {
      notifySuccess('Reservation updated.');
      setEditing(null);
      fetchReservations({ date: filterDate, limit: 100 });
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const ok = await cancelReservation(cancelTarget);
    if (ok) {
      notifySuccess('Reservation cancelled.');
      setCancelTarget(null);
      fetchReservations({ date: filterDate, limit: 100 });
    }
  };

  const handleDateFilter = (date: string) => {
    setFilterDate(date);
    fetchReservations({ date: date || undefined, limit: 100 });
  };

  const openEdit = (reservation: any) => {
    populateFormForEdit(reservation);
    setEditing(reservation.id ?? '');
  };

  const openNew = () => {
    resetForm();
    setShowNew(true);
  };

  // ── Render ──
  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Reservation management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Reservations</h1>
          <p className="text-sm text-content-secondary mt-0.5">
            {fmtDate(filterDate)} — {filtered.length} reservation
            {filtered.length !== 1 ? 's' : ''}
            {activeStatusTab !== 'all' && ` (${activeStatusTab})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReservations({ date: filterDate, limit: 100 })}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={openNew}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Reservation
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
            <Calendar className="w-3.5 h-3.5" />
            Confirmed
          </div>
          <p className="text-lg font-bold text-primary">{counts.confirmed}</p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <Users className="w-3.5 h-3.5" />
            Seated
          </div>
          <p className="text-lg font-bold text-success">{counts.seated}</p>
        </Card>
        <Card padding="lg">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled / No-show
          </div>
          <p className="text-lg font-bold text-content-tertiary">
            {counts.cancelled}
          </p>
        </Card>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-content-secondary" />
          <Input
            label=""
            type="date"
            value={filterDate}
            onChange={(e) => handleDateFilter(e.target.value)}
            wrapperClassName="w-40"
          />
        </div>
        <Tabs
          tabs={STATUS_TABS}
          activeTab={activeStatusTab}
          onChange={setActiveStatusTab}
          variant="underline"
        />
      </div>

      {/* ═══ Reservations Table ═══ */}
      {isLoading && !reservations.length ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <ScreenEmptyState
          screen="customers"
          title={
            activeStatusTab !== 'all'
              ? `No ${activeStatusTab} reservations`
              : 'No reservations for this date'
          }
          description="Create a new reservation to get started."
          action="New Reservation"
          onAction={openNew}
        />
      ) : (
        <Table
          columns={[
            {
              key: 'time',
              header: 'Time',
              accessor: (r) => (
                <span className="text-xs font-semibold whitespace-nowrap">
                  {r.time}
                </span>
              ),
            },
            {
              key: 'customerName',
              header: 'Customer',
              accessor: (r) => (
                <div>
                  <p className="text-xs font-medium">{r.customerName}</p>
                  {r.customerPhone && (
                    <p className="text-[10px] text-content-tertiary flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />
                      {r.customerPhone}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'partySize',
              header: 'Guests',
              accessor: (r) => (
                <span className="flex items-center gap-1 text-xs">
                  <Users className="w-3 h-3 text-content-tertiary" />
                  {r.partySize}
                </span>
              ),
            },
            {
              key: 'tableName',
              header: 'Table',
              accessor: (r) =>
                r.tableName ? (
                  <span className="text-xs font-medium">{r.tableName}</span>
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
                  variant={
                    r.status === 'confirmed'
                      ? 'primary'
                      : r.status === 'seated'
                        ? 'success'
                        : r.status === 'cancelled'
                          ? 'danger'
                          : r.status === 'no-show'
                            ? 'warning'
                            : 'default'
                  }
                  dot
                >
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </Badge>
              ),
            },
            {
              key: 'notes',
              header: 'Notes',
              accessor: (r) =>
                r.notes ? (
                  <span className="text-xs text-content-secondary max-w-[120px] truncate block">
                    {r.notes}
                  </span>
                ) : (
                  <span className="text-xs text-content-tertiary">—</span>
                ),
            },
            {
              key: 'actions',
              header: '',
              accessor: (r) => (
                <div className="flex items-center gap-0.5">
                  {r.status !== 'cancelled' && r.status !== 'no-show' && (
                    <>
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-content-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setCancelTarget(r.id ?? '')}
                        className="p-1.5 text-content-tertiary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(r) => r.id ?? ''}
        />
      )}

      {/* ═══ NEW / EDIT RESERVATION MODAL ═══ */}
      <Modal
        open={showNew || !!editing}
        onClose={() => {
          setShowNew(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Reservation' : 'New Reservation'}
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                setShowNew(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editing ? handleUpdate : handleCreate}
              isLoading={isLoading}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {editing ? 'Save Changes' : 'Create Reservation'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Customer Name *"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Full name"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="+91 XXXXXXXXXX"
            />
            <Input
              label="Email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Party Size"
              type="number"
              value={formPartySize}
              onChange={(e) => setFormPartySize(e.target.value)}
            />
            <Input
              label="Date"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />
            <Input
              label="Time"
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Table (optional)"
              value={formTableName}
              onChange={(e) => setFormTableName(e.target.value)}
              placeholder="e.g. T-01"
            />
            {editing && (
              <Select
                label="Status"
                options={RESERVATION_STATUSES}
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              />
            )}
          </div>
          <Input
            label="Notes (optional)"
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Special requests, occasions..."
          />
        </div>
      </Modal>

      {/* ═══ CANCEL CONFIRMATION ═══ */}
      <ConfirmationDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this reservation?"
        confirmLabel="Yes, Cancel"
        variant="warning"
      />
    </div>
  );
};
