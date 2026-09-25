import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { formatWorkspaceMoney } from '@/utils/workspaceMoney';
import { useSettingsStore } from '@/stores/settings-store';
import { useTableStore } from '@/stores/table-store';
import type { TableData } from '@/stores/table-store';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  Plus, Search, ChevronDown, X, User, Clock, Bell,
  Users as UsersIcon, RotateCw, ListFilter, Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { IconBar } from '@/components/layout/IconBar';

const sections = ['All', 'Indoor', 'Outdoor', 'Private', 'Terrace'];

export default function Tables() {
  const { currencyCode, currencySymbol: currencyOverride } = useWorkspaceCurrencyValue();
  /** All amounts on this screen are already in major units (rupees). */
  const money = (amount: number) => formatWorkspaceMoney(amount, currencyCode, currencyOverride);
  const navigate = useNavigate();
  const tables = useTableStore((s) => s.tables);
  const [activeSection, setActiveSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTables = tables.filter((t) => {
    if (activeSection !== 'All' && t.section !== activeSection) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const occupied = tables.filter((t) => t.status === 'occupied').length;
  const available = tables.filter((t) => t.status === 'available').length;
  const reserved = tables.filter((t) => t.status === 'reserved').length;

  const openOrder = (table: TableData) => {
    navigate('/billing', { state: { tableId: table.id } });
  };

  const toggleStatus = (table: TableData) => {
    if (table.status === 'available') {
      useTableStore.getState().updateTable(table.id, { status: 'reserved' });
    } else if (table.status === 'reserved') {
      useTableStore.getState().updateTable(table.id, { status: 'available' });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pos-ground select-none font-sans">
      <IconBar />

      {/* MAIN */}
      <div className="flex flex-1 flex-col min-w-0 ml-rail">
        {/* Header */}
        <header className="flex items-center h-[48px] px-4 bg-pos-bar border-b border-pos-card-border shrink-0">
          <h1 className="text-[14px] font-bold text-pos-ink tracking-tight">Nexora Solution</h1>
          <span className="h-4 w-px bg-pos-card-border mx-2.5" />
          <span className="text-[11px] text-pos-muted font-medium">Table Management</span>
          <div className="flex-1 drag-region h-full" />
          <div className="flex items-center gap-3 no-drag">
            <span className="text-[11px] text-pos-muted flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-pos-muted" />02:45 PM</span>
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

        {/* Sub-header */}
        <div className="flex items-center h-[40px] px-3 bg-pos-bar border-b border-pos-card-border shrink-0 gap-2">
          <div className="flex items-center gap-1">
            {sections.map((sec) => (
              <button key={sec} onClick={() => setActiveSection(sec)}
                className={cn('px-3 py-1.5 text-[10px] font-semibold rounded transition-colors',
                  activeSection === sec ? 'bg-pos-primary text-white' : 'text-pos-muted hover:text-pos-ink hover:bg-pos-ground')}>{sec}</button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-[10px] text-pos-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pos-primary" />{available} Available</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{occupied} Occupied</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />{reserved} Reserved</span>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-pos-muted" />
            <input type="text" placeholder="Find table..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-32 pl-7 pr-2 text-[10px] bg-pos-bar border border-pos-card-border rounded text-pos-ink placeholder:text-pos-muted focus:outline-none focus:ring-1 focus:ring-pos-primary" />
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold text-white bg-pos-primary hover:bg-pos-primary-dark rounded transition-colors"><Plus className="h-3 w-3" />Add Table</button>
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredTables.map((table) => {
              const isAvailable = table.status === 'available';
              const isOccupied = table.status === 'occupied';
              const isReserved = table.status === 'reserved';
              const isBilling = table.status === 'billing';

              return (
                <button
                  key={table.id}
                  onClick={() => isOccupied || isBilling ? openOrder(table) : toggleStatus(table)}
                  onDoubleClick={() => openOrder(table)}
                  className={cn(
                    'relative text-left p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer group',
                    'hover:shadow-md hover:-translate-y-0.5',
                    isAvailable && 'bg-white border-pos-primary/30 hover:border-pos-primary',
                    isOccupied && 'bg-amber-50/50 border-amber-300 hover:border-amber-400',
                    isReserved && 'bg-sky-50/30 border-sky-200 hover:border-sky-300',
                    isBilling && 'bg-red-50/30 border-red-300 hover:border-red-400',
                  )}
                >
                  {/* Status dot */}
                  <span className={cn('absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full',
                    isAvailable && 'bg-pos-primary',
                    isOccupied && 'bg-amber-500 animate-pulse',
                    isReserved && 'bg-sky-500',
                    isBilling && 'bg-red-500')} />

                  {/* Name + Section */}
                  <p className="text-[13px] font-bold text-pos-ink leading-tight">{table.name}</p>
                  <p className="text-[9px] text-pos-muted mt-0.5">{table.section}</p>

                  {/* Capacity */}
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-pos-muted">
                    <UsersIcon className="h-3 w-3" />
                    <span>{table.capacity} seats</span>
                  </div>

                  {/* Occupied/Billing info */}
                  {(isOccupied || isBilling) && table.customer && (
                    <div className="mt-2 pt-2 border-t border-pos-card-border space-y-0.5">
                      <p className="text-[10px] font-medium text-pos-ink">{table.customer}</p>
                      <div className="flex items-center justify-between text-[9px] text-pos-muted">
                        <span>{table.orderId}</span>
                        <span className="font-semibold">{money(table.orderTotal ?? 0)}</span>
                      </div>
                      <p className="text-[9px] text-pos-muted">{table.time} • {table.guests} guests</p>
                    </div>
                  )}

                  {/* Reserved */}
                  {isReserved && (
                    <div className="mt-2 pt-2 border-t border-pos-card-border">
                      <p className="text-[10px] text-sky-600 font-medium">Reserved</p>
                    </div>
                  )}

                  {/* Available */}
                  {isAvailable && (
                    <div className="mt-2 pt-2 border-t border-pos-card-border">
                      <p className="text-[10px] text-pos-primary font-medium">Click to reserve</p>
                      <p className="text-[9px] text-pos-muted">Double-click to open</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredTables.length === 0 && (
            <div className="flex items-center justify-center h-64 text-pos-muted">
              <div className="text-center">
                <LayoutGrid className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">
                  {tables.length === 0
                    ? 'No tables loaded. Go to Settings → Menu Configuration to load tables.'
                    : 'No tables match your search.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <footer className="flex items-center justify-between h-[32px] px-3 bg-pos-deep shrink-0 gap-2">
          <div className="flex items-center gap-1">
            <button className="flex items-center gap-1 h-[22px] px-2.5 text-[9px] font-semibold bg-white text-pos-deep rounded-sm hover:bg-gray-100 active:scale-[0.98] transition-all"><Plus className="h-3 w-3" />Add Table</button>
            <button className="flex items-center gap-1 h-[22px] px-2 text-[9px] font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-sm transition-all"><Grid3X3 className="h-3 w-3" />Grid</button>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/60">
            <button className="flex items-center gap-1 hover:text-white transition-colors"><Search className="h-3 w-3" />Search</button>
            <button className="flex items-center gap-1 hover:text-white transition-colors"><ListFilter className="h-3 w-3" />Filter Tables</button>
            <button className="flex items-center gap-1 hover:text-white transition-colors"><RotateCw className="h-3 w-3" />Refresh</button>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/60">
            <span>{tables.length} Tables</span>
            <span className="text-white/30">|</span>
            <span className="text-white">{occupied} Active</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
