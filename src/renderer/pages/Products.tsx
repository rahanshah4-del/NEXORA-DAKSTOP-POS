import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney, getWorkspaceSymbol } from '@/utils/workspaceMoney';
import { useSettingsStore } from '@/stores/settings-store';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { IconBar } from '@/components/layout/IconBar';
import {
  ChefHat, ChevronDown, X, User, Clock, Search, Plus, Bell,
  Pencil, Trash2, Check, X as XIcon, RotateCw, Save,
} from 'lucide-react';
import { useMenuStore, type MenuItem } from '@/stores/menu-store';

export default function Products() {
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  const currSymbol = getWorkspaceSymbol(currencyCode, currencyOverride);
  const money = (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride);
  const { items, categories, addItem, updateItem, removeItem, toggleActive, addCategory } = useMenuStore();
  const [activeCat, setActiveCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MenuItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: 0, category: 'Main Course', description: '' });
  const [newCategory, setNewCategory] = useState('');

  const filtered = items.filter((i) => {
    if (activeCat !== 'All' && i.category !== activeCat) return false;
    if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const activeCount = items.filter((i) => i.active).length;
  const inactiveCount = items.filter((i) => !i.active).length;

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setEditData({ name: item.name, price: item.price, category: item.category, description: item.description });
  };

  const saveEdit = () => {
    if (editingId && editData.name && (editData.price ?? 0) > 0) {
      updateItem(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const handleAdd = () => {
    if (!newItem.name || newItem.price <= 0) return;
    addItem({ name: newItem.name, price: newItem.price, category: newItem.category, description: newItem.description });
    setNewItem({ name: '', price: 0, category: 'Main Course', description: '' });
    setShowAddForm(false);
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) { addCategory(newCategory.trim()); setNewCategory(''); }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-rail">
        <header className="flex items-center h-[48px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0">
          <h1 className="text-[14px] font-bold text-pos-ink tracking-tight">Nexora Solution</h1><span className="h-4 w-px bg-pos-card-border mx-2.5" /><span className="text-[11px] text-pos-muted font-medium">Menu Management</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag"><span className="text-[11px] text-pos-muted flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-pos-muted" />02:45 PM</span><div className="flex items-center gap-1.5 text-[11px] text-pos-muted"><div className="h-6 w-6 rounded-full bg-pos-primary-soft flex items-center justify-center"><User className="h-3 w-3 text-pos-primary" /></div>Admin <ChevronDown className="h-3 w-3 text-pos-muted" /></div><div className="flex items-center ml-1"><button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-pos-muted hover:bg-pos-ground rounded transition-colors">─</button><button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-pos-muted hover:bg-pos-ground rounded transition-colors">□</button><button className="h-7 w-9 flex items-center justify-center text-pos-muted hover:text-white hover:bg-pos-cancel-fg rounded transition-colors"><X className="h-3.5 w-3.5" /></button></div></div>
        </header>

        {/* Stats + Actions */}
        <div className="flex items-center h-[50px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0 gap-3">
          <span className="text-[10px] text-pos-muted">Total: <span className="font-bold text-pos-ink">{items.length}</span></span>
          <span className="text-[10px] text-pos-muted">Active: <span className="font-bold text-pos-primary">{activeCount}</span></span>
          <span className="text-[10px] text-pos-muted">Inactive: <span className="font-bold text-pos-muted">{inactiveCount}</span></span>
          <div className="flex-1" />
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-white bg-pos-primary hover:bg-pos-primary-dark rounded transition-colors"><Plus className="h-3.5 w-3.5" />Add Product</button>
        </div>

        {/* Filters */}
        <div className="flex items-center h-[40px] px-3 bg-pos-bar border-b border-pos-card-border shrink-0 gap-1">
          <button onClick={() => setActiveCat('All')} className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors', activeCat === 'All' ? 'bg-pos-primary text-white' : 'text-pos-muted hover:text-pos-ink hover:bg-pos-ground')}>All</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCat(cat)} className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors', activeCat === cat ? 'bg-pos-primary text-white' : 'text-pos-muted hover:text-pos-ink hover:bg-pos-ground')}>{cat}</button>
          ))}
          <div className="flex-1" />
          <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-pos-muted" /><input type="text" placeholder="Search menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 w-40 pl-7 pr-2 text-[10px] bg-pos-bar border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" /></div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-pos-primary-soft border-b border-pos-primary/20 px-4 py-3 flex items-center gap-3 shrink-0">
            <input type="text" placeholder="Product name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-7 w-40 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
            <input type="number" placeholder={`Price (${currSymbol})`} value={newItem.price || ''} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} className="h-7 w-24 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
            <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="h-7 px-2 text-[10px] border border-pos-card-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-pos-primary">
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <button onClick={handleAdd} disabled={!newItem.name || newItem.price <= 0} className="flex items-center gap-1 px-3 h-7 text-[10px] font-semibold bg-pos-primary text-white rounded hover:bg-pos-primary-dark disabled:opacity-50 transition-colors"><Check className="h-3.5 w-3.5" />Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-2 h-7 text-[10px] text-pos-muted hover:text-pos-ink"><XIcon className="h-3.5 w-3.5" /></button>
            <div className="h-5 w-px bg-pos-card-border" />
            <input type="text" placeholder="New category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-7 w-32 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
            <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="text-[10px] text-pos-primary font-medium hover:underline disabled:opacity-50">+ Add Category</button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-pos-card-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-pos-divider bg-pos-bar">{['Product','Category','Price','Status','Actions'].map((h)=>(<th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-pos-muted uppercase tracking-wider">{h}</th>))}</tr></thead>
              <tbody className="divide-y divide-pos-divider">
                {filtered.map((item) => (
                  <tr key={item.id} className={cn('hover:bg-pos-bar transition-colors', !item.active && 'opacity-50')}>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <input type="text" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="h-7 w-36 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" autoFocus />
                      ) : (
                        <div><p className="text-[11px] font-medium text-pos-ink">{item.name}</p>{item.description && <p className="text-[9px] text-pos-muted">{item.description}</p>}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <select value={editData.category || ''} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="h-7 px-2 text-[10px] border border-pos-card-border rounded bg-white">
                          {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-pos-muted">{item.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <input type="number" value={editData.price || ''} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} className="h-7 w-20 px-2 text-[10px] border border-pos-card-border rounded focus:outline-none focus:ring-1 focus:ring-pos-primary" />
                      ) : (
                        <span className="text-[11px] font-semibold text-pos-primary">{money(item.price)}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleActive(item.id)} className={cn('px-2 py-0.5 text-[9px] font-semibold rounded-full transition-colors', item.active ? 'bg-pos-primary-soft text-pos-primary-dark' : 'bg-gray-100 text-gray-500')}>{item.active ? 'Active' : 'Inactive'}</button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {editingId === item.id ? (
                          <><button onClick={saveEdit} className="p-1 text-pos-primary hover:bg-pos-primary-soft rounded"><Check className="h-3.5 w-3.5" /></button><button onClick={cancelEdit} className="p-1 text-pos-muted hover:bg-pos-ground rounded"><XIcon className="h-3.5 w-3.5" /></button></>
                        ) : (
                          <><button onClick={() => startEdit(item)} className="p-1 text-pos-muted hover:text-pos-primary hover:bg-pos-primary-soft rounded"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => removeItem(item.id)} className="p-1 text-pos-muted hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button></>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="flex items-center justify-center h-32 text-pos-muted text-xs">No products found</div>}
          </div>
        </div>

        <footer className="flex items-center justify-between h-[32px] px-3 bg-pos-deep shrink-0">
          <div className="text-[9px] text-white/70">{items.length} products • {categories.length} categories</div>
          <div className="text-[9px] text-white/60 flex items-center gap-1"><RotateCw className="h-3 w-3" />Changes auto-saved</div>
        </footer>
      </div>
    </div>
  );
}
