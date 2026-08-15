import { lazy, Suspense } from 'react';
import { getCurrencySymbol } from '@/utils/formatters';
import { createHashRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { SettingsLayout } from '@/layouts/SettingsLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PageSpinner } from '@/components/ui/Spinner';

// Lazy-loaded pages
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Billing = lazy(() => import('@/pages/Billing'));
const Tables = lazy(() => import('@/pages/Tables'));
const Kitchen = lazy(() => import('@/pages/Kitchen'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const Customers = lazy(() => import('@/pages/Customers'));
const Products = lazy(() => import('@/pages/Products'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Reports = lazy(() => import('@/pages/Reports'));
const Employees = lazy(() => import('@/pages/Employees'));
const CashSessions = lazy(() => import('@/pages/CashSessions'));
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'));
const Reservations = lazy(() => import('@/pages/Reservations'));

const General = lazy(() => import('@/pages/settings/General'));
const Profile = lazy(() => import('@/pages/settings/Profile'));
const BillingSettings = lazy(() => import('@/pages/settings/BillingSettings'));
const Security = lazy(() => import('@/pages/settings/Security'));
const About = lazy(() => import('@/pages/settings/About'));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>;
}

// Fallback for lazy() chunk-load failures — otherwise a failed dynamic import
// leaves the user on a blank screen with no way out.
function RouteError() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#f8faf9] p-6 text-center">
      <h1 className="text-lg font-bold text-[#111814]">Something went wrong</h1>
      <p className="text-sm text-[#47554d]">This screen failed to load. Please reload or go back.</p>
      <div className="flex items-center gap-2">
        <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-semibold text-white bg-[#0f7b47] hover:bg-[#056638] rounded">Reload</button>
        <button onClick={() => window.history.back()} className="px-4 py-2 text-sm font-medium border border-[#dee2e6] text-[#47554d] rounded hover:bg-white">Go Back</button>
      </div>
    </div>
  );
}

// ═══ Management Pages ═══
import { useState, useEffect } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { useTableStore } from '@/stores/table-store';
import { Save, Plus, Wallet, DollarSign, Calendar, Clock, AlertTriangle, Check, RefreshCw, Download, UtensilsCrossed, Grid3X3, Search, Pencil, Trash2, X as XIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { mapMenuItems, extractCategories } from '@/utils/menu-items';
import { userFriendlyError } from '@/utils/error-helper';
import { useCurrencySymbol } from '@/hooks/useCurrency';

function MenuConfigPage() {
  const currSymbol = useCurrencySymbol();
  const { items, categories, addItem, updateItem, removeItem, toggleActive, addCategory } = useMenuStore();
  const { tables } = useTableStore();

  // Load Menu state
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCounts, setLastCounts] = useState<{ menu: number; tables: number } | null>(null);

  // Menu item form state
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: 0, category: 'Main Course', description: '' });
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; price: number; category: string; description?: string }>({ name: '', price: 0, category: '' });

  // Filter & search
  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLoadMenu = async () => {
    const workspaceId = useAuthStore.getState().staffProfile?.workspaceId;
    if (!workspaceId) {
      setStatusMessage({ type: 'error', text: 'Not signed in — please log in again.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const currentUser = await window.api.auth.getCurrentUser();
      console.log('[DEBUG LoadMenu] auth.getCurrentUser() via IPC:', currentUser ? `uid=${currentUser.uid}` : 'NULL — NO FIREBASE AUTH SESSION');
      console.log('[DEBUG LoadMenu] staffProfile.workspaceId exists:', !!workspaceId);
      if (!currentUser && workspaceId) {
        console.warn('[DEBUG LoadMenu] ⚠️ DESYNC: staffProfile.workspaceId is set but Firebase Auth session is NULL');
      }
    } catch (e: any) {
      console.error('[DEBUG LoadMenu] auth.getCurrentUser() FAILED:', e.message);
    }

    try {
      const [menuResult, tablesResult] = await Promise.all([
        window.api.firestore.menuItems.list(workspaceId),
        window.api.firestore.tables.list(workspaceId),
      ]);

      const parts: string[] = [];
      let menuItems: Array<{ id: string; name: string; price: number; category: string; active: boolean; description?: string }> = [];
      let tableData: Array<{ id: string; name: string; section: string; capacity: number; status: string }> = [];
      let anySuccess = false;

      if (menuResult.success) {
        const rawItems = (menuResult.items ?? []) as Array<Record<string, unknown>>;
        menuItems = mapMenuItems(rawItems);
        const cats = extractCategories(menuItems);
        useMenuStore.getState().setItems(menuItems);
        useMenuStore.getState().setCategories(cats);
        parts.push(`Menu: ${menuItems.length} item${menuItems.length !== 1 ? 's' : ''} OK`);
        anySuccess = true;
      } else {
        parts.push(`Menu: FAILED — ${userFriendlyError(menuResult.error, 'loading menu')}`);
      }

      if (tablesResult.success) {
        const rawTables = (tablesResult.tables ?? []) as Array<Record<string, unknown>>;
        tableData = rawTables.map((t) => ({
          id: String(t.id ?? `t-${Math.random().toString(36).slice(2, 9)}`),
          name: String(t.name ?? ''),
          section: String(t.section || 'Indoor'),
          capacity: Number(t.capacity) || 4,
          status: (['available', 'occupied', 'reserved', 'billing'].includes(String(t.status))
            ? String(t.status)
            : 'available'),
        }));
        useTableStore.getState().setTables(tableData as any);
        parts.push(`Tables: ${tableData.length} table${tableData.length !== 1 ? 's' : ''} OK`);
        anySuccess = true;
      } else {
        parts.push(`Tables: FAILED — ${userFriendlyError(tablesResult.error, 'loading tables')}`);
      }

      setLastCounts({ menu: menuItems.length, tables: tableData.length });
      setStatusMessage({
        type: anySuccess ? 'success' : 'error',
        text: parts.join('  |  '),
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: userFriendlyError(e, 'loading menu and tables') });
    } finally {
      setIsLoading(false);
    }
  };

  // ── CRUD handlers ──
  const handleAddItem = () => {
    if (!newItem.name || newItem.price <= 0) return;
    addItem({ name: newItem.name, price: newItem.price, category: newItem.category, description: newItem.description });
    setNewItem({ name: '', price: 0, category: 'Main Course', description: '' });
    setShowAddItem(false);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const startEdit = (item: typeof items[0]) => {
    setEditingId(item.id);
    setEditData({ name: item.name, price: item.price, category: item.category, description: item.description });
  };

  const saveEdit = () => {
    if (editingId && editData.name) {
      updateItem(editingId, editData);
      setEditingId(null);
      setEditData({ name: '', price: 0, category: '' });
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditData({ name: '', price: 0, category: '' }); };

  // ── Filtered items ──
  const filtered = items.filter((i) => {
    if (activeCat !== 'All' && i.category !== activeCat) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeCount = items.filter((i) => i.active).length;
  const inactiveCount = items.filter((i) => !i.active).length;

  // ── Table status helpers ──
  const statusVariant = (s: string): 'success' | 'warning' | 'danger' | 'info' | 'default' => {
    switch (s) {
      case 'available': return 'success';
      case 'occupied': return 'warning';
      case 'reserved': return 'info';
      case 'billing': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-content">Menu Configuration</h2>
      <p className="text-sm text-content-secondary">Manage your restaurant menu, categories, and pricing</p>

      {/* ── Load Menu & Tables Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Load Menu & Tables from Server</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <p className="text-xs text-content-secondary">
            Fetch the latest menu items and table layouts from your Firestore workspace.
            This <strong>replaces</strong> all local menu and table data with the server version.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleLoadMenu}
              disabled={isLoading}
              leftIcon={isLoading ? undefined : <Download className="h-3.5 w-3.5" />}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Load Menu & Tables from Server'
              )}
            </Button>
            <div className="flex items-center gap-3 text-xs text-content-secondary">
              <span className="flex items-center gap-1">
                <UtensilsCrossed className="h-3.5 w-3.5 text-content-tertiary" />
                <strong>{items.length}</strong> items
              </span>
              <span className="flex items-center gap-1">
                <Grid3X3 className="h-3.5 w-3.5 text-content-tertiary" />
                <strong>{tables.length}</strong> tables
              </span>
            </div>
          </div>
          {statusMessage && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-danger/10 text-danger border border-danger/30'
            }`}>
              {statusMessage.type === 'success' ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
              {statusMessage.text}
            </div>
          )}
          {lastCounts && (
            <p className="text-[10px] text-content-tertiary">
              Last loaded: {lastCounts.menu} items &amp; {lastCounts.tables} tables
            </p>
          )}
        </div>
      </Card>

      {/* ── Quick Actions Card ── */}
      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary" size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => { setShowAddCategory(!showAddCategory); setShowAddItem(false); }}
            >
              Add Category
            </Button>
            <Button
              variant="secondary" size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => { setShowAddItem(!showAddItem); setShowAddCategory(false); }}
            >
              Add Item
            </Button>
            <Button
              variant="secondary" size="sm"
              onClick={handleLoadMenu}
              disabled={isLoading}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Import from Server
            </Button>
          </div>

          {/* Add Category inline form */}
          {showAddCategory && (
            <div className="flex items-center gap-2 p-3 bg-surface-tertiary rounded-lg border border-border">
              <Input
                placeholder="Category name (e.g. Beverages)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                className="h-8 text-xs flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleAddCategory} disabled={!newCategory.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowAddCategory(false); setNewCategory(''); }}>
                Cancel
              </Button>
            </div>
          )}

          {/* Add Item inline form */}
          {showAddItem && (
            <div className="flex items-center gap-2 p-3 bg-surface-tertiary rounded-lg border border-border flex-wrap">
              <Input
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                className="h-8 text-xs w-36"
                autoFocus
              />
              <Input
                type="number" placeholder="Price (₹)"
                value={newItem.price || ''}
                onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                className="h-8 text-xs w-24"
              />
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="h-8 px-2 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {categories.length === 0 && <option value="Main Course">Main Course</option>}
                {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              <Button size="sm" onClick={handleAddItem} disabled={!newItem.name || newItem.price <= 0}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowAddItem(false); setNewItem({ name: '', price: 0, category: 'Main Course', description: '' }); }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ── Menu Items Section ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Menu Items</CardTitle>
            <div className="flex items-center gap-2 text-[10px] text-content-secondary">
              <span>Total: <strong>{items.length}</strong></span>
              <span>Active: <strong className="text-success">{activeCount}</strong></span>
              <span>Inactive: <strong className="text-content-tertiary">{inactiveCount}</strong></span>
            </div>
          </div>
        </CardHeader>
        <div className="space-y-2">
          {/* Category tabs + search */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setActiveCat('All')}
              className={cn('px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors',
                activeCat === 'All' ? 'bg-primary text-white' : 'text-content-secondary hover:text-content hover:bg-surface-tertiary')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn('px-2.5 py-1 text-[10px] font-semibold rounded-full transition-colors',
                  activeCat === cat ? 'bg-primary text-white' : 'text-content-secondary hover:text-content hover:bg-surface-tertiary')}
              >
                {cat}
              </button>
            ))}
            <div className="flex-1" />
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-content-tertiary" />
              <input
                type="text" placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-36 pl-7 pr-2 text-[10px] bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-tertiary">
                  {['Product', 'Category', 'Price', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-content-tertiary uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((item) => (
                  <tr key={item.id} className={cn('hover:bg-surface-tertiary transition-colors', !item.active && 'opacity-50')}>
                    <td className="px-3 py-2">
                      {editingId === item.id ? (
                        <input
                          type="text" value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="h-7 w-full px-2 text-[10px] border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                      ) : (
                        <div>
                          <p className="text-[11px] font-medium text-content">{item.name}</p>
                          {item.description && <p className="text-[9px] text-content-tertiary">{item.description}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === item.id ? (
                        <select
                          value={editData.category}
                          onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                          className="h-7 px-2 text-[10px] border border-border rounded bg-white"
                        >
                          {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-content-secondary">{item.category}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editingId === item.id ? (
                        <input
                          type="number" value={editData.price || ''}
                          onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })}
                          className="h-7 w-20 px-2 text-[10px] border border-border rounded"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-primary">{currSymbol}{item.price}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleActive(item.id)}
                        className={cn('px-2 py-0.5 text-[9px] font-semibold rounded-full transition-colors',
                          item.active ? 'bg-success/15 text-success' : 'bg-surface-tertiary text-content-tertiary')}
                      >
                        {item.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {editingId === item.id ? (
                          <>
                            <button onClick={saveEdit} className="p-1 text-success hover:bg-success/10 rounded"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={cancelEdit} className="p-1 text-content-tertiary hover:bg-surface-tertiary rounded"><XIcon className="h-3.5 w-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="p-1 text-content-tertiary hover:text-primary hover:bg-primary/10 rounded"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => removeItem(item.id)} className="p-1 text-content-tertiary hover:text-danger hover:bg-danger/10 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs text-content-tertiary">
                {items.length === 0 ? 'No menu items yet. Add some or load from server.' : 'No items match your filters.'}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Tables Section ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tables</CardTitle>
            <span className="text-[10px] text-content-secondary"><strong>{tables.length}</strong> tables</span>
          </div>
        </CardHeader>
        {tables.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-xs text-content-tertiary">
            No tables loaded. Click "Load Menu & Tables from Server" to fetch your table layout.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {tables.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'flex flex-col items-center justify-center p-3 rounded-lg border transition-colors',
                  t.status === 'available' && 'bg-success/5 border-success/20 hover:bg-success/10',
                  t.status === 'occupied' && 'bg-warning/5 border-warning/20 hover:bg-warning/10',
                  t.status === 'reserved' && 'bg-info/5 border-info/20 hover:bg-info/10',
                  t.status === 'billing' && 'bg-danger/5 border-danger/20 hover:bg-danger/10',
                )}
              >
                <span className="text-[11px] font-bold text-content">{t.name}</span>
                <span className="text-[9px] text-content-secondary">{t.section}</span>
                <span className="text-[9px] text-content-tertiary">{t.capacity} seats</span>
                <Badge size="sm" variant={statusVariant(t.status)} className="mt-1">{t.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Expense categories (matching the website's exact list) ──
const EXPENSE_CATEGORIES = ['Office', 'Salary', 'Fuel', 'Marketing', 'Software', 'Maintenance', 'Travel', 'Other'] as const;
const EXPENSE_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Wallet', 'Cheque', 'Other'] as const;

interface FirestoreExpense {
  id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paidBy: string;
  status: string;
  approvalStatus: string;
  requiresApproval: boolean;
  notes?: string;
  receiptReference?: string;
  createdBy: string;
  workspaceId: string;
  createdAt?: string;
  updatedAt?: string;
}

function fmtExpenseDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function expenseStatusBadge(approvalStatus: string) {
  const s = (approvalStatus || 'pending').toLowerCase();
  if (s === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200'; // pending
}

function ExpensePage() {
  const currency = useSettingsStore((s) => s.currency);
  const currSymbol = getCurrencySymbol(currency);
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;
  const staffName = staffProfile?.staffName || 'Staff';

  // ── Data state ──
  const [expenses, setExpenses] = useState<FirestoreExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ──
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Office');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('Cash');
  const [formPaidBy, setFormPaidBy] = useState(staffName);
  const [formNotes, setFormNotes] = useState('');
  const [formReceiptRef, setFormReceiptRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ── Fetch ──
  const fetchExpenses = async () => {
    if (!wsId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.firestore.expenses.list(wsId);
      if (result.success) {
        setExpenses((result.expenses ?? []) as FirestoreExpense[]);
      } else {
        setError(result.error ?? 'Failed to load expenses');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [wsId]);

  // ── Derived ──
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const now = new Date();
  const thisMonthExpenses = expenses
    .filter((e) => {
      if (!e.createdAt) return false;
      const d = new Date(e.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + (e.amount || 0), 0);
  const pendingAmount = expenses
    .filter((e) => e.approvalStatus === 'pending' || !e.approvalStatus)
    .reduce((s, e) => s + (e.amount || 0), 0);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!wsId) { setSubmitError('Not signed in'); return; }
    if (!formAmount || Number(formAmount) <= 0) { setSubmitError('Please enter a valid amount'); return; }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await window.api.firestore.expenses.create(wsId, {
        title: formTitle.trim() || formCategory,
        category: formCategory,
        amount: Number(formAmount),
        currency: currency || 'PKR',
        paymentMethod: formPaymentMethod,
        paidBy: formPaidBy.trim() || staffName,
        notes: formNotes.trim() || undefined,
        receiptReference: formReceiptRef.trim() || undefined,
      });
      if (result.success) {
        setSubmitSuccess(true);
        // Reset form
        setFormTitle('');
        setFormAmount('');
        setFormCategory('Office');
        setFormPaymentMethod('Cash');
        setFormPaidBy(staffName);
        setFormNotes('');
        setFormReceiptRef('');
        setShowForm(false);
        // Refresh list
        fetchExpenses();
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setSubmitError(result.error ?? 'Failed to submit expense');
      }
    } catch (err: any) {
      setSubmitError(err.message ?? 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-content">Expense Management</h2>
          <p className="text-sm text-content-secondary">Submit and track business expenses — approval by owner/admin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchExpenses} disabled={isLoading}>
            Refresh
          </Button>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowForm(!showForm)}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Submit success banner */}
      {submitSuccess && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Expense submitted for approval
        </div>
      )}

      {/* Add Expense Form */}
      {showForm && (
        <Card padding="lg">
          <CardHeader><CardTitle>Submit New Expense</CardTitle></CardHeader>
          <div className="space-y-3">
            {submitError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[10px] font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{submitError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Printer ink refill" />
              <div>
                <label className="block text-[10px] font-semibold text-content mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-[34px] px-3 text-[11px] border border-[#dee2e6] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {EXPENSE_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <Input label="Amount" type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" />
              <div>
                <label className="block text-[10px] font-semibold text-content mb-1">Payment Method</label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full h-[34px] px-3 text-[11px] border border-[#dee2e6] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {EXPENSE_PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </div>
              <Input label="Paid By" value={formPaidBy} onChange={(e) => setFormPaidBy(e.target.value)} placeholder={staffName} />
              <Input label="Receipt Reference (optional)" value={formReceiptRef} onChange={(e) => setFormReceiptRef(e.target.value)} placeholder="e.g. INV-001" />
              <div className="col-span-2">
                <Input label="Notes (optional)" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Any additional details..." />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSubmit} disabled={submitting} leftIcon={submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}>
                {submitting ? 'Submitting…' : 'Submit for Approval'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowForm(false); setSubmitError(null); }}>
                Cancel
              </Button>
              <span className="text-[9px] text-content-tertiary ml-1">Status will be set to Pending → website owner/admin approves</span>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">Total Expenses</p>
          <p className="text-lg font-bold text-content">{currSymbol}{totalExpenses.toLocaleString('en-IN')}</p>
        </Card>
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">This Month</p>
          <p className="text-lg font-bold text-warning">{currSymbol}{thisMonthExpenses.toLocaleString('en-IN')}</p>
        </Card>
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">Pending Approval</p>
          <p className="text-lg font-bold text-danger">{currSymbol}{pendingAmount.toLocaleString('en-IN')}</p>
        </Card>
      </div>

      {/* Loading / Error / Empty states */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-5 w-5 animate-spin text-content-tertiary" />
          <span className="ml-2 text-xs text-content-tertiary">Loading expenses…</span>
        </div>
      )}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-xs text-red-500">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchExpenses}>Retry</Button>
        </div>
      )}
      {!isLoading && !error && expenses.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-content-tertiary">
          <p className="text-xs">No expenses submitted yet</p>
          <p className="text-[10px] mt-0.5">Click "Add Expense" to submit your first expense for approval</p>
        </div>
      )}

      {/* Expenses Table */}
      {!isLoading && !error && expenses.length > 0 && (
        <Table
          columns={[
            {
              key: 'date',
              header: 'Date',
              accessor: (r: FirestoreExpense) => <span className="text-xs">{fmtExpenseDate(r.createdAt)}</span>,
            },
            {
              key: 'category',
              header: 'Category',
              accessor: (r: FirestoreExpense) => <span className="text-xs font-medium">{r.category}</span>,
            },
            {
              key: 'title',
              header: 'Description',
              accessor: (r: FirestoreExpense) => (
                <div>
                  <span className="text-xs">{r.title || r.category}</span>
                  {r.notes && <p className="text-[9px] text-content-tertiary truncate max-w-[160px]">{r.notes}</p>}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              accessor: (r: FirestoreExpense) => <span className="text-xs font-semibold">{currSymbol}{r.amount.toLocaleString('en-IN')}</span>,
            },
            {
              key: 'paidBy',
              header: 'Paid By',
              accessor: (r: FirestoreExpense) => <span className="text-xs">{r.paidBy}</span>,
            },
            {
              key: 'paymentMethod',
              header: 'Method',
              accessor: (r: FirestoreExpense) => <span className="text-xs text-content-secondary">{r.paymentMethod}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              accessor: (r: FirestoreExpense) => (
                <Badge size="sm" variant={r.approvalStatus === 'approved' ? 'success' : r.approvalStatus === 'rejected' ? 'danger' : 'warning'}>
                  {r.approvalStatus === 'approved' ? 'Approved' : r.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                </Badge>
              ),
            },
          ]}
          data={expenses}
          keyExtractor={(r) => r.id}
        />
      )}
    </div>
  );
}

function CloseDayPage() {
  const currSymbol = getCurrencySymbol(useSettingsStore.getState().currency);  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-content">Close Day</h2>
      <p className="text-sm text-content-secondary">Start Date: {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</p>
      <Card>
        <CardHeader><CardTitle>Day Summary</CardTitle></CardHeader>
        <div className="grid grid-cols-3 gap-3">
          {[{l:'Total Orders',v:'42'},{l:'Revenue',v:'₹24,500'},{l:'Expenses',v:'₹10,800'}].map((x)=>(<div key={x.l}><p className="text-[10px] text-content-tertiary">{x.l}</p><p className="text-sm font-bold">{x.v}</p></div>))}
        </div>
      </Card>
      {!confirmed ? (
        <Button variant="danger" onClick={()=>setConfirmed(true)} leftIcon={<AlertTriangle className="h-4 w-4"/>}>Close Day</Button>
      ) : (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-success"/><span className="text-sm font-semibold text-success">Day Closed Successfully!</span>
        </div>
      )}
    </div>
  );
}

function CloseShiftPage() {
  const currSymbol = getCurrencySymbol(useSettingsStore.getState().currency);  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-content">Close Shift</h2>
      <p className="text-sm text-content-secondary">Start Date: {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})} {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</p>
      <Card>
        <CardHeader><CardTitle>Shift Summary</CardTitle></CardHeader>
        <div className="grid grid-cols-3 gap-3">
          {[{l:'Orders Handled',v:'18'},{l:'Cash Collected',v:'₹12,400'},{l:'UPI/Card',v:'₹8,100'}].map((x)=>(<div key={x.l}><p className="text-[10px] text-content-tertiary">{x.l}</p><p className="text-sm font-bold">{x.v}</p></div>))}
        </div>
      </Card>
      {!confirmed ? (
        <Button variant="danger" onClick={()=>setConfirmed(true)} leftIcon={<Clock className="h-4 w-4"/>}>Close Shift</Button>
      ) : (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-success"/><span className="text-sm font-semibold text-success">Shift Closed Successfully!</span>
        </div>
      )}
    </div>
  );
}

// ── Wallet types ──
interface WalletCustomer {
  id: string;
  name: string;
  phone: string;
  walletCredit: number;
  walletDue: number;
}

interface WalletTx {
  id: string;
  type: string;
  amount: number;
  source: string;
  sourceId?: string;
  note?: string;
  balanceBefore?: number;
  balanceAfter?: number;
  dueBefore?: number;
  dueAfter?: number;
  createdBy?: string;
  createdAt?: string;
}

function WalletPage() {
  const currency = useSettingsStore((s) => s.currency);
  const currSymbol = getCurrencySymbol(currency);
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const wsId = staffProfile?.workspaceId;
  const staffRole = staffProfile?.staffRole || '';
  const isOwner = staffRole === 'owner' || staffRole === 'admin';

  // ── Customer list ──
  const [customers, setCustomers] = useState<WalletCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Detail view ──
  const [selectedCustomer, setSelectedCustomer] = useState<WalletCustomer | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // ── Add Credit form (owner only) ──
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditSuccess, setCreditSuccess] = useState(false);

  // ── Settle Due form (owner only) ──
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleCustomerId, setSettleCustomerId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccess, setSettleSuccess] = useState(false);

  // ── Fetch customers ──
  const fetchCustomers = async () => {
    if (!wsId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.firestore.wallet.customersList(wsId);
      if (result.success) {
        setCustomers((result.customers ?? []) as WalletCustomer[]);
      } else {
        setError(result.error ?? 'Failed to load customers');
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [wsId]);

  // ── Fetch transactions for selected customer ──
  const fetchTransactions = async (customerId: string) => {
    if (!wsId) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const result = await window.api.firestore.wallet.transactionsList(wsId, customerId);
      if (result.success) {
        setTransactions((result.transactions ?? []) as WalletTx[]);
      } else {
        setTxError(result.error ?? 'Failed to load transactions');
      }
    } catch (err: any) {
      setTxError(err.message ?? 'Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  };

  const selectCustomer = (c: WalletCustomer) => {
    setSelectedCustomer(c);
    fetchTransactions(c.id);
  };

  // ── Add Credit (owner only) ──
  const handleAddCredit = async () => {
    if (!wsId || !creditCustomerId) return;
    const amt = Number(creditAmount);
    if (!amt || amt <= 0) { setCreditError('Enter a valid amount'); return; }
    setCreditError(null);
    setCreditSubmitting(true);
    try {
      const result = await window.api.firestore.wallet.transactionAdd(wsId, creditCustomerId, {
        type: 'credit',
        amount: amt,
        source: 'manual_topup',
        note: creditNote.trim() || undefined,
      });
      if (result.success) {
        setCreditSuccess(true);
        setShowCreditForm(false);
        setCreditAmount('');
        setCreditNote('');
        setCreditCustomerId('');
        fetchCustomers();
        if (selectedCustomer) fetchTransactions(selectedCustomer.id);
        setTimeout(() => setCreditSuccess(false), 3000);
      } else {
        setCreditError(result.error ?? 'Failed to add credit');
      }
    } catch (err: any) {
      setCreditError(err.message ?? 'Failed to add credit');
    } finally {
      setCreditSubmitting(false);
    }
  };

  // ── Settle Due (owner only) ──
  const handleSettleDue = async () => {
    if (!wsId || !settleCustomerId) return;
    const amt = Number(settleAmount);
    const cust = customers.find((c) => c.id === settleCustomerId);
    if (!amt || amt <= 0) { setSettleError('Enter a valid amount'); return; }
    if (cust && amt > cust.walletDue) { setSettleError(`Amount exceeds outstanding due (${currSymbol}${cust.walletDue})`); return; }
    setSettleError(null);
    setSettleSubmitting(true);
    try {
      const result = await window.api.firestore.wallet.transactionAdd(wsId, settleCustomerId, {
        type: 'debit',
        amount: amt,
        source: 'due_settlement',
        note: settleNote.trim() || undefined,
      });
      if (result.success) {
        setSettleSuccess(true);
        setShowSettleForm(false);
        setSettleAmount('');
        setSettleNote('');
        setSettleCustomerId('');
        fetchCustomers();
        if (selectedCustomer) fetchTransactions(selectedCustomer.id);
        setTimeout(() => setSettleSuccess(false), 3000);
      } else {
        setSettleError(result.error ?? 'Failed to settle due');
      }
    } catch (err: any) {
      setSettleError(err.message ?? 'Failed to settle due');
    } finally {
      setSettleSubmitting(false);
    }
  };

  // ── Derived ──
  const totalBalance = customers.reduce((s, c) => s + (c.walletCredit || 0), 0);
  const totalDues = customers.reduce((s, c) => s + (c.walletDue || 0), 0);

  // ── Render ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-content">Wallet Management</h2>
          <p className="text-sm text-content-secondary">
            {isOwner ? 'Manage customer wallets, top-ups, and due settlements' : 'View customer wallet balances'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={fetchCustomers} disabled={isLoading}>
            Refresh
          </Button>
          {isOwner && (
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowCreditForm(!showCreditForm)}>
              Add Credit
            </Button>
          )}
        </div>
      </div>

      {/* Success banners */}
      {creditSuccess && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Credit added successfully — balance updated
        </div>
      )}
      {settleSuccess && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Due settled successfully — balance updated
        </div>
      )}

      {/* Add Credit Form (owner only) */}
      {isOwner && showCreditForm && (
        <Card padding="lg">
          <CardHeader><CardTitle>Add Credit (Top-Up)</CardTitle></CardHeader>
          <div className="space-y-3">
            {creditError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[10px] font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{creditError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-content mb-1">Customer</label>
                <select
                  value={creditCustomerId}
                  onChange={(e) => setCreditCustomerId(e.target.value)}
                  className="w-full h-[34px] px-3 text-[11px] border border-[#dee2e6] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.phone})</option>))}
                </select>
              </div>
              <Input label="Amount" type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="0" />
              <div className="col-span-2">
                <Input label="Note (optional)" value={creditNote} onChange={(e) => setCreditNote(e.target.value)} placeholder="e.g. Cash top-up" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAddCredit} disabled={creditSubmitting || !creditCustomerId}>
                {creditSubmitting ? 'Processing…' : 'Add Credit'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowCreditForm(false); setCreditError(null); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Settle Due Form (owner only) */}
      {isOwner && showSettleForm && (
        <Card padding="lg">
          <CardHeader><CardTitle>Settle Outstanding Due</CardTitle></CardHeader>
          <div className="space-y-3">
            {settleError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[10px] font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{settleError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-content mb-1">Customer</label>
                <select
                  value={settleCustomerId}
                  onChange={(e) => { setSettleCustomerId(e.target.value); const c = customers.find((x) => x.id === e.target.value); if (c) setSettleAmount(String(c.walletDue)); }}
                  className="w-full h-[34px] px-3 text-[11px] border border-[#dee2e6] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select customer…</option>
                  {customers.filter((c) => c.walletDue > 0).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {currSymbol}{c.walletDue} due</option>
                  ))}
                </select>
              </div>
              <Input label="Amount" type="number" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} placeholder="0" />
              <div className="col-span-2">
                <Input label="Note (optional)" value={settleNote} onChange={(e) => setSettleNote(e.target.value)} placeholder="e.g. Cash settlement" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSettleDue} disabled={settleSubmitting || !settleCustomerId}>
                {settleSubmitting ? 'Processing…' : 'Settle Due'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { setShowSettleForm(false); setSettleError(null); }}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">Total Balance</p>
          <p className="text-lg font-bold text-success">{currSymbol}{totalBalance.toLocaleString('en-IN')}</p>
        </Card>
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">Total Dues</p>
          <p className="text-lg font-bold text-danger">{currSymbol}{totalDues.toLocaleString('en-IN')}</p>
        </Card>
        <Card padding="lg">
          <p className="text-[10px] text-content-tertiary">Customers</p>
          <p className="text-lg font-bold">{customers.length}</p>
        </Card>
      </div>

      {/* Loading / Error / Empty */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-5 w-5 animate-spin text-content-tertiary" />
          <span className="ml-2 text-xs text-content-tertiary">Loading customers…</span>
        </div>
      )}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-xs text-red-500">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchCustomers}>Retry</Button>
        </div>
      )}
      {!isLoading && !error && customers.length === 0 && (
        <div className="flex flex-col items-center justify-center h-32 text-content-tertiary">
          <p className="text-xs">No customers with wallet activity</p>
        </div>
      )}

      {/* Customer Table + Detail Panel */}
      {!isLoading && !error && customers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Customer list */}
          <div>
            <Table
              columns={[
                { key: 'name', header: 'Customer', accessor: (r: WalletCustomer) => (
                  <button onClick={() => selectCustomer(r)} className="text-xs font-medium text-primary hover:underline text-left">{r.name}</button>
                )},
                { key: 'phone', header: 'Phone', accessor: (r: WalletCustomer) => <span className="text-xs">{r.phone || '—'}</span> },
                { key: 'walletCredit', header: 'Wallet', accessor: (r: WalletCustomer) => <span className="text-xs font-semibold text-success">{currSymbol}{r.walletCredit.toLocaleString('en-IN')}</span> },
                { key: 'walletDue', header: 'Dues', accessor: (r: WalletCustomer) => (
                  <div className="flex items-center gap-2">
                    <span className={r.walletDue > 0 ? 'text-xs font-semibold text-danger' : 'text-xs'}>{r.walletDue > 0 ? `${currSymbol}${r.walletDue.toLocaleString('en-IN')}` : '—'}</span>
                    {isOwner && r.walletDue > 0 && (
                      <button onClick={() => { setSettleCustomerId(r.id); setSettleAmount(String(r.walletDue)); setShowSettleForm(true); }}
                        className="text-[9px] text-primary hover:underline whitespace-nowrap">Settle</button>
                    )}
                  </div>
                )},
              ]}
              data={customers}
              keyExtractor={(r) => r.id}
            />
          </div>

          {/* Transaction detail panel */}
          <div>
            {!selectedCustomer ? (
              <Card padding="lg">
                <div className="flex flex-col items-center justify-center h-32 text-content-tertiary">
                  <p className="text-xs">Select a customer to view transaction history</p>
                </div>
              </Card>
            ) : (
              <Card padding="lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-content">{selectedCustomer.name}</h4>
                    <p className="text-[10px] text-content-secondary">{selectedCustomer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-content-tertiary">Balance</p>
                    <p className="text-xs font-bold text-success">{currSymbol}{selectedCustomer.walletCredit.toLocaleString('en-IN')}</p>
                    {selectedCustomer.walletDue > 0 && <p className="text-[10px] font-bold text-danger">Due: {currSymbol}{selectedCustomer.walletDue.toLocaleString('en-IN')}</p>}
                  </div>
                </div>

                <h5 className="text-[10px] font-semibold text-content-tertiary uppercase mb-2 border-b border-border pb-1">Transaction Ledger</h5>

                {txLoading && (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin text-content-tertiary" />
                  </div>
                )}
                {txError && <p className="text-[10px] text-red-500 py-4">{txError}</p>}
                {!txLoading && !txError && transactions.length === 0 && (
                  <p className="text-[10px] text-content-tertiary py-4 text-center">No transactions yet</p>
                )}
                {!txLoading && !txError && transactions.length > 0 && (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-surface-tertiary border-b border-border/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded', tx.type === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                              {tx.type === 'credit' ? '+' : '-'}{currSymbol}{tx.amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-medium text-content truncate">{tx.source?.replace(/_/g, ' ')}</span>
                          </div>
                          {tx.note && <p className="text-[9px] text-content-tertiary ml-1 mt-0.5 truncate">{tx.note}</p>}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="text-[9px] text-content-secondary">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
                          <p className="text-[8px] text-content-tertiary">Bal: {currSymbol}{(tx.balanceAfter ?? 0).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserPage() {
  const currSymbol = getCurrencySymbol(useSettingsStore.getState().currency);  const users = [
    {id:'u1',name:'Admin',role:'Administrator',email:'admin@nexora.com',status:'Active' as const},
    {id:'u2',name:'Rahul S.',role:'Waiter',email:'rahul@nexora.com',status:'Active' as const},
    {id:'u3',name:'Priya M.',role:'Chef',email:'priya@nexora.com',status:'Active' as const},
    {id:'u4',name:'Amit K.',role:'Cashier',email:'amit@nexora.com',status:'Inactive' as const},
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-base font-bold text-content">User Management</h2><p className="text-sm text-content-secondary">Create and manage system users</p></div>
        <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>Add User</Button>
      </div>
      <Table columns={[
        {key:'name',header:'Name',accessor:(r:typeof users[0])=><span className="text-xs font-medium">{r.name}</span>},
        {key:'role',header:'Role',accessor:(r)=><span className="text-xs">{r.role}</span>},
        {key:'email',header:'Email',accessor:(r)=><span className="text-xs">{r.email}</span>},
        {key:'status',header:'Status',accessor:(r)=><Badge size="sm" variant={r.status==='Active'?'success':'danger'}>{r.status}</Badge>},
      ]} data={users} keyExtractor={(r)=>r.id} />
    </div>
  );
}

export const router = createHashRouter([
  // Auth
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Login />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // POS Billing — standalone layout (no AppLayout wrapper)
  {
    path: '/billing',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Billing />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Tables — standalone layout
  {
    path: '/tables',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Tables />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Orders — standalone layout
  {
    path: '/orders',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <OrdersPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Kitchen — standalone layout
  {
    path: '/kitchen',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Kitchen />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Cash Sessions — standalone layout
  {
    path: '/cash-sessions',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <CashSessions />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Payments — standalone layout
  {
    path: '/payments',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <PaymentsPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Reservations — standalone layout
  {
    path: '/reservations',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Reservations />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Dashboard — standalone layout
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Dashboard />
          </SuspenseWrapper>
        ),
      },
    ],
  },

  // Other pages wrapped in AppLayout
  {
    path: '/app',
    element: <ProtectedRoute />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/" replace />,
          },
          {
            path: 'dashboard',
            element: (
              <SuspenseWrapper>
                <Dashboard />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'customers',
            element: (
              <SuspenseWrapper>
                <Customers />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'products',
            element: (
              <SuspenseWrapper>
                <Products />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'inventory',
            element: (
              <SuspenseWrapper>
                <Inventory />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'reports',
            element: (
              <SuspenseWrapper>
                <Reports />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employees',
            element: (
              <SuspenseWrapper>
                <Employees />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              {
                index: true,
                element: (
                  <SuspenseWrapper>
                    <General />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'profile',
                element: (
                  <SuspenseWrapper>
                    <Profile />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'billing',
                element: (
                  <SuspenseWrapper>
                    <BillingSettings />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'security',
                element: (
                  <SuspenseWrapper>
                    <Security />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'about',
                element: (
                  <SuspenseWrapper>
                    <About />
                  </SuspenseWrapper>
                ),
              },
              // Management sections (from sidebar)
              {
                path: 'menu-config',
                element: <SuspenseWrapper><MenuConfigPage /></SuspenseWrapper>,
              },
              {
                path: 'products',
                element: <Navigate to="/app/products" replace />,
              },
              {
                path: 'expenses',
                element: <SuspenseWrapper><ExpensePage /></SuspenseWrapper>,
              },
              {
                path: 'close-day',
                element: <SuspenseWrapper><CloseDayPage /></SuspenseWrapper>,
              },
              {
                path: 'close-shift',
                element: <SuspenseWrapper><CloseShiftPage /></SuspenseWrapper>,
              },
              {
                path: 'crm-customers',
                element: <Navigate to="/app/customers" replace />,
              },
              {
                path: 'wallets',
                element: <SuspenseWrapper><WalletPage /></SuspenseWrapper>,
              },
              {
                path: 'users',
                element: <SuspenseWrapper><UserPage /></SuspenseWrapper>,
              },
            ],
          },
        ],
      },
    ],
  },

  // Redirect sidebar paths → /app equivalents
  {
    path: '/customers',
    element: <Navigate to="/app/customers" replace />,
  },
  {
    path: '/products',
    element: <Navigate to="/app/products" replace />,
  },
  {
    path: '/inventory',
    element: <Navigate to="/app/inventory" replace />,
  },
  {
    path: '/reports',
    element: <Navigate to="/app/reports" replace />,
  },
  {
    path: '/employees',
    element: <Navigate to="/app/employees" replace />,
  },
  {
    path: '/settings',
    element: <Navigate to="/app/settings" replace />,
  },

  {
    path: '*',
    element: <Navigate to="/billing" replace />,
  },
]);
