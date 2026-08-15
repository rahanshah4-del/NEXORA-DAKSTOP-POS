import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useAuthStore } from '@/stores/auth-store';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/shared/PageHeader';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/shared/EmptyState';
import { TableSkeleton } from '@/screens/components/SkeletonLoader';
import { ScreenErrorState } from '@/screens/components/ScreenStates';
import { userFriendlyError } from '@/utils/error-helper';
import { notifySuccess, notifyError, notifyInfo } from '@/stores/toast-store';
import {
  Plus, Phone, Mail, Users, Edit, Trash2, Search,
  Wallet, IndianRupee, Clock, MapPin, AlertTriangle,
  X, Check, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PosCustomer } from '@/../firebase/firestore-pos';

// Use the PosCustomer type directly (aliased for brevity)
type Customer = PosCustomer;

export default function Customers() {
  const currSymbol = useCurrencySymbol();
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;

  // ── Data state ──
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [inactiveConfirm, setInactiveConfirm] = useState<Customer | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add/Edit form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCustomerType, setFormCustomerType] = useState('General');
  const [formNotes, setFormNotes] = useState('');
  const [formAddress, setFormAddress] = useState('');

  // ── Fetch ──

  const fetchCustomers = useCallback(async () => {
    if (!wsId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.firestore.customers.list(wsId);
      if (!result.success) {
        setError(userFriendlyError(result.error, 'loading customers'));
        return;
      }
      setCustomers((result.customers ?? []) as Customer[]);
    } catch (err: any) {
      setError(userFriendlyError(err, 'loading customers'));
    } finally {
      setIsLoading(false);
    }
  }, [wsId]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Filtering ──

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(searchQuery.trim()) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q),
    );
  }, [customers, searchQuery]);

  // ── Summary stats ──

  const totalWallet = customers.reduce((s, c) => s + (c.walletCredit ?? c.wallet ?? 0), 0);
  const totalDues = customers.reduce((s, c) => s + (c.walletDue ?? c.dues ?? 0), 0);
  const totalSpent = customers.reduce((s, c) => s + (c.lifetimeSpend ?? c.totalSpent ?? 0), 0);

  // ── Form helpers ──

  const openAdd = () => {
    setEditingCustomer(null);
    setFormName(''); setFormPhone(''); setFormEmail(''); setFormCompany('');
    setFormCustomerType('General'); setFormNotes(''); setFormAddress('');
    setShowAddModal(true);
  };

  const openEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormName(cust.name || '');
    setFormPhone(cust.phone || '');
    setFormEmail(cust.email || '');
    setFormCompany(cust.company || '');
    setFormCustomerType(cust.customerType || 'General');
    setFormNotes(cust.notes || '');
    setFormAddress(cust.address || '');
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim() || !wsId) return;
    setSaving(true);
    try {
      const baseData = {
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || undefined,
        company: formCompany.trim() || undefined,
        customerType: formCustomerType,
        notes: formNotes.trim() || undefined,
        address: formAddress.trim() || undefined,
      };

      if (editingCustomer?.id) {
        const result = await window.api.firestore.customers.update(wsId, editingCustomer.id, baseData as any);
        if (!result.success) throw new Error(result.error ?? 'Update failed');
        notifySuccess('Customer updated');
      } else {
        const result = await window.api.firestore.customers.create(wsId, baseData as any);
        if (!result.success) throw new Error(result.error ?? 'Create failed');
        notifySuccess('Customer added');
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      notifyError(err?.message ?? 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!inactiveConfirm?.id || !wsId) return;
    setSaving(true);
    try {
      // Cashiers can't hard-delete — set status to 'Inactive' instead
      const result = await window.api.firestore.customers.update(wsId, inactiveConfirm.id, { status: 'Inactive' } as any);
      if (!result.success) throw new Error(result.error ?? 'Update failed');
      notifySuccess(`${inactiveConfirm.name} marked as Inactive`);
      setInactiveConfirm(null);
      fetchCustomers();
    } catch (err: any) {
      notifyError(err?.message ?? 'Failed to deactivate customer');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──

  if (!wsId) {
    return (
      <PageContainer padding="lg">
        <PageHeader title="Customers" description="Manage your customer database" />
        <ScreenErrorState error="Not signed in — please log in again." />
      </PageContainer>
    );
  }

  return (
    <PageContainer padding="lg">
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>Add Customer</Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1"><Users className="h-3.5 w-3.5" />Total</div>
          <p className="text-lg font-bold text-content">{customers.length}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1"><Wallet className="h-3.5 w-3.5" />Wallet Balance</div>
          <p className="text-lg font-bold text-success">{currSymbol}{totalWallet.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1"><AlertTriangle className="h-3.5 w-3.5" />Outstanding</div>
          <p className={cn('text-lg font-bold', totalDues > 0 ? 'text-danger' : 'text-content')}>{currSymbol}{totalDues.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-content-secondary mb-1"><IndianRupee className="h-3.5 w-3.5" />Total Spent</div>
          <p className="text-lg font-bold text-content">{currSymbol}{totalSpent.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Search + Error */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-tertiary" />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {error && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{error}</span>
            <button onClick={fetchCustomers} className="font-semibold underline hover:text-red-800">Retry</button>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : error && customers.length === 0 ? (
        <ScreenErrorState error={error} onRetry={fetchCustomers} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={customers.length === 0 ? "No customers yet" : "No results"} description={customers.length === 0 ? "Add your first customer to get started" : "No customers match your search"} />
      ) : (
        <div className="space-y-2">
          {filtered.map((cust) => {
            const cWallet = cust.walletCredit ?? cust.wallet ?? 0;
            const cDues = cust.walletDue ?? cust.dues ?? 0;
            const cSpent = cust.lifetimeSpend ?? cust.totalSpent ?? 0;
            const cOrders = cust.posOrdersCount ?? cust.visits ?? 0;
            const isInactive = (cust.status || '').toLowerCase() === 'inactive';
            return (
              <div key={cust.id} className={cn('bg-white border rounded-xl overflow-hidden', isInactive ? 'border-red-200 opacity-60' : 'border-border')}>
                {/* Main row */}
                <div className="flex items-center gap-4 p-3">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', isInactive ? 'bg-red-50' : 'bg-primary/10')}>
                    <span className={cn('text-sm font-bold', isInactive ? 'text-red-400' : 'text-primary')}>{(cust.name || '?').charAt(0)}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-content">{cust.name || 'Unknown'}</p>
                      {isInactive && <Badge variant="danger" size="sm">Inactive</Badge>}
                      {cDues > 0 && <Badge variant="danger" size="sm">{currSymbol}{cDues.toLocaleString('en-IN')} due</Badge>}
                      {cWallet > 0 && <Badge variant="success" size="sm">{currSymbol}{cWallet.toLocaleString('en-IN')} wallet</Badge>}
                      {cust.customerType && cust.customerType !== 'General' && <Badge variant="info" size="sm">{cust.customerType}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-content-secondary">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{cust.phone || '—'}</span>
                      {cust.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{cust.email}</span>}
                      {cust.company && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{cust.company}</span>}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-center shrink-0">
                    <div><p className="text-[10px] text-content-tertiary">Orders</p><p className="text-xs font-semibold">{cOrders}</p></div>
                    <div><p className="text-[10px] text-content-tertiary">Spent</p><p className="text-xs font-semibold">{currSymbol}{cSpent.toLocaleString('en-IN')}</p></div>
                    <div><p className="text-[10px] text-content-tertiary">Wallet</p><p className={cn('text-xs font-semibold', cWallet > 0 ? 'text-success' : 'text-content-tertiary')}>{currSymbol}{cWallet.toLocaleString('en-IN')}</p></div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(cust)} className="p-1.5 text-content-tertiary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit"><Edit className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setInactiveConfirm(cust)} className="p-1.5 text-content-tertiary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title={isInactive ? 'Already inactive' : 'Deactivate'}><Trash2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setExpandedRow(expandedRow === cust.id ? null : cust.id)} className="p-1.5 text-content-tertiary hover:text-content hover:bg-surface-tertiary rounded-lg transition-colors">
                      {expandedRow === cust.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {/* Expanded details */}
                {expandedRow === cust.id && (
                  <div className="border-t border-border bg-[#f8faf9] px-4 py-3 grid grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
                    <div><span className="text-content-tertiary">Status:</span><p className="text-content font-medium">{cust.status || 'Active'}</p></div>
                    <div><span className="text-content-tertiary">Type:</span><p className="text-content font-medium">{cust.customerType || 'General'}</p></div>
                    <div><span className="text-content-tertiary">Wallet Credit:</span><p className="text-success font-medium">{currSymbol}{cWallet.toLocaleString('en-IN')}</p></div>
                    <div><span className="text-content-tertiary">Outstanding:</span><p className={cn('font-medium', cDues > 0 ? 'text-danger' : 'text-content')}>{currSymbol}{cDues.toLocaleString('en-IN')}</p></div>
                    <div><span className="text-content-tertiary">Lifetime Spend:</span><p className="text-content font-medium">{currSymbol}{cSpent.toLocaleString('en-IN')}</p></div>
                    <div><span className="text-content-tertiary">POS Orders:</span><p className="text-content font-medium">{cOrders}</p></div>
                    <div><span className="text-content-tertiary">Last POS Order:</span><p className="text-content font-medium">{cust.lastPosOrderAt ? new Date(cust.lastPosOrderAt).toLocaleDateString('en-IN') : '—'}</p></div>
                    <div><span className="text-content-tertiary">Notes:</span><p className="text-content font-medium">{cust.notes || '—'}</p></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ADD/EDIT MODAL ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setEditingCustomer(null); } }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#dee2e6] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#dee2e6] bg-[#f8faf9]">
              <h3 className="text-[14px] font-bold text-[#111814]">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingCustomer(null); }} className="p-1 rounded text-[#94a399] hover:text-[#111814] hover:bg-[#e2e8e4]"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Name *" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Full name" />
                <Input label="Phone *" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" />
                <Input label="Email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" />
                <Input label="Company" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} placeholder="Company name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-content mb-1">Customer Type</label>
                  <select
                    value={formCustomerType}
                    onChange={(e) => setFormCustomerType(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {['General', 'VIP', 'Corporate'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <Input label="Address" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Address" />
              </div>
              <Input label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Internal notes..." />
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 pt-2">
              <Button variant="secondary" onClick={() => { setShowAddModal(false); setEditingCustomer(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formName.trim() || !formPhone.trim() || saving} leftIcon={editingCustomer ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
                {saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DEACTIVATE CONFIRMATION ═══ */}
      {inactiveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setInactiveConfirm(null); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-[340px] bg-white rounded-xl shadow-2xl border border-[#dee2e6] p-6 text-center animate-slide-up">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-[14px] font-bold text-[#111814] mb-1">Deactivate Customer?</h3>
            <p className="text-[11px] text-content-secondary mb-4">
              This will set <span className="font-semibold">{inactiveConfirm.name}</span> to <span className="font-semibold text-amber-600">Inactive</span>.<br />
              Cashiers cannot permanently delete customers — but inactive customers won't appear in POS search results by default.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setInactiveConfirm(null)} className="flex-1 h-[34px] text-[11px] font-medium border border-[#dee2e6] text-[#47554d] rounded-lg hover:bg-[#f1f5f2]">Cancel</button>
              <button onClick={handleDeactivate} disabled={saving} className="flex-1 h-[34px] text-[11px] font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">{saving ? '...' : 'Deactivate'}</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
