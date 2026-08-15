import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useSettingsStore } from '@/stores/settings-store';
import { getCurrencySymbol } from '@/utils/formatters';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { IconBar } from '@/components/layout/IconBar';
import {
  ChefHat, ChevronDown, X, User, Clock, Search, Plus, Bell,
  Pencil, Trash2, Check, X as XIcon, RotateCw, Save,
} from 'lucide-react';
import { useMenuStore, type MenuItem } from '@/stores/menu-store';

export default function Products() {
  const currSymbol = useCurrencySymbol();
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8faf9] select-none font-sans">
      <IconBar />

      <div className="flex flex-1 flex-col min-w-0 ml-[56px]">
        <header className="flex items-center h-[48px] px-4 bg-white border-b border-[#e2e8e4] shrink-0">
          <h1 className="text-[14px] font-bold text-[#111814] tracking-tight">Nexora Solution</h1><span className="h-4 w-px bg-[#dee2e6] mx-2.5" /><span className="text-[11px] text-[#94a399] font-medium">Menu Management</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag"><span className="text-[11px] text-[#47554d] flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#94a399]" />02:45 PM</span><div className="flex items-center gap-1.5 text-[11px] text-[#47554d]"><div className="h-6 w-6 rounded-full bg-[#cceddb] flex items-center justify-center"><User className="h-3 w-3 text-[#0f7b47]" /></div>Admin <ChevronDown className="h-3 w-3 text-[#94a399]" /></div><div className="flex items-center ml-1"><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-[#47554d] hover:bg-[#f1f5f2] rounded transition-colors">─</button><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-[#47554d] hover:bg-[#f1f5f2] rounded transition-colors">□</button><button className="h-7 w-9 flex items-center justify-center text-[#94a399] hover:text-white hover:bg-[#da3849] rounded transition-colors"><X className="h-3.5 w-3.5" /></button></div></div>
        </header>

        {/* Stats + Actions */}
        <div className="flex items-center h-[50px] px-4 bg-white border-b border-[#dee2e6] shrink-0 gap-3">
          <span className="text-[10px] text-[#94a399]">Total: <span className="font-bold text-[#111814]">{items.length}</span></span>
          <span className="text-[10px] text-[#94a399]">Active: <span className="font-bold text-[#42b273]">{activeCount}</span></span>
          <span className="text-[10px] text-[#94a399]">Inactive: <span className="font-bold text-[#94a399]">{inactiveCount}</span></span>
          <div className="flex-1" />
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-white bg-[#0f7b47] hover:bg-[#056638] rounded transition-colors"><Plus className="h-3.5 w-3.5" />Add Product</button>
        </div>

        {/* Filters */}
        <div className="flex items-center h-[40px] px-3 bg-white border-b border-[#dee2e6] shrink-0 gap-1">
          <button onClick={() => setActiveCat('All')} className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors', activeCat === 'All' ? 'bg-[#0f7b47] text-white' : 'text-[#47554d] hover:text-[#111814] hover:bg-[#f1f5f2]')}>All</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCat(cat)} className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors', activeCat === cat ? 'bg-[#0f7b47] text-white' : 'text-[#47554d] hover:text-[#111814] hover:bg-[#f1f5f2]')}>{cat}</button>
          ))}
          <div className="flex-1" />
          <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#94a399]" /><input type="text" placeholder="Search menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-7 w-40 pl-7 pr-2 text-[10px] bg-[#f8faf9] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" /></div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-[#f0f9f4] border-b border-[#0f7b47]/20 px-4 py-3 flex items-center gap-3 shrink-0">
            <input type="text" placeholder="Product name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="h-7 w-40 px-2 text-[10px] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" />
            <input type="number" placeholder="Price (₹)" value={newItem.price || ''} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} className="h-7 w-24 px-2 text-[10px] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" />
            <select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} className="h-7 px-2 text-[10px] border border-[#dee2e6] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0f7b47]">
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <button onClick={handleAdd} disabled={!newItem.name || newItem.price <= 0} className="flex items-center gap-1 px-3 h-7 text-[10px] font-semibold bg-[#0f7b47] text-white rounded hover:bg-[#056638] disabled:opacity-50 transition-colors"><Check className="h-3.5 w-3.5" />Save</button>
            <button onClick={() => setShowAddForm(false)} className="px-2 h-7 text-[10px] text-[#94a399] hover:text-[#111814]"><XIcon className="h-3.5 w-3.5" /></button>
            <div className="h-5 w-px bg-[#dee2e6]" />
            <input type="text" placeholder="New category..." value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="h-7 w-32 px-2 text-[10px] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" />
            <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="text-[10px] text-[#0f7b47] font-medium hover:underline disabled:opacity-50">+ Add Category</button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-[#e6e6e7] shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#dfdfdf] bg-[#fafafa]">{['Product','Category','Price','Status','Actions'].map((h)=>(<th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-[#757575] uppercase tracking-wider">{h}</th>))}</tr></thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {filtered.map((item) => (
                  <tr key={item.id} className={cn('hover:bg-[#f8faf9] transition-colors', !item.active && 'opacity-50')}>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <input type="text" value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="h-7 w-36 px-2 text-[10px] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" autoFocus />
                      ) : (
                        <div><p className="text-[11px] font-medium text-[#111814]">{item.name}</p>{item.description && <p className="text-[9px] text-[#94a399]">{item.description}</p>}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <select value={editData.category || ''} onChange={(e) => setEditData({ ...editData, category: e.target.value })} className="h-7 px-2 text-[10px] border border-[#dee2e6] rounded bg-white">
                          {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-[#47554d]">{item.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {editingId === item.id ? (
                        <input type="number" value={editData.price || ''} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} className="h-7 w-20 px-2 text-[10px] border border-[#dee2e6] rounded focus:outline-none focus:ring-1 focus:ring-[#0f7b47]" />
                      ) : (
                        <span className="text-[11px] font-semibold text-[#0f7b47]">{currSymbol}{item.price}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => toggleActive(item.id)} className={cn('px-2 py-0.5 text-[9px] font-semibold rounded-full transition-colors', item.active ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-gray-100 text-gray-500')}>{item.active ? 'Active' : 'Inactive'}</button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {editingId === item.id ? (
                          <><button onClick={saveEdit} className="p-1 text-[#42b273] hover:bg-[#f0f9f4] rounded"><Check className="h-3.5 w-3.5" /></button><button onClick={cancelEdit} className="p-1 text-[#94a399] hover:bg-[#f1f5f2] rounded"><XIcon className="h-3.5 w-3.5" /></button></>
                        ) : (
                          <><button onClick={() => startEdit(item)} className="p-1 text-[#94a399] hover:text-[#0f7b47] hover:bg-[#f0f9f4] rounded"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => removeItem(item.id)} className="p-1 text-[#94a399] hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button></>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="flex items-center justify-center h-32 text-[#94a399] text-xs">No products found</div>}
          </div>
        </div>

        <footer className="flex items-center justify-between h-[32px] px-3 bg-[#204937] shrink-0">
          <div className="text-[9px] text-white/70">{items.length} products • {categories.length} categories</div>
          <div className="text-[9px] text-white/60 flex items-center gap-1"><RotateCw className="h-3 w-3" />Changes auto-saved</div>
        </footer>
      </div>
    </div>
  );
}
