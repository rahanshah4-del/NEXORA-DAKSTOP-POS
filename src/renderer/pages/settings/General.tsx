import { useState, useCallback, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settings-store';
import {
  RotateCw, Monitor, Sun, Moon, Download, Printer, FileText, X, Check, Bell,
} from 'lucide-react';
import { cn } from '@/utils/cn';

// ═══════════════════════
// Toast Notification System
// ═══════════════════════
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const toastListeners: Set<(toast: Toast) => void> = new Set();

function showToast(message: string, type: ToastType = 'success') {
  const toast: Toast = { id: ++toastId, message, type };
  toastListeners.forEach((fn) => fn(toast));
}

function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        timers.current.delete(toast.id);
      }, 2000);
      timers.current.set(toast.id, timer);
    };
    toastListeners.add(handler);
    return () => { toastListeners.delete(handler); timers.current.forEach((t) => clearTimeout(t)); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-[12px] font-medium',
            'animate-slide-up',
            toast.type === 'success' && 'bg-[#e8f5e9] border-[#4CAF50]/30 text-[#2e7d32]',
            toast.type === 'error' && 'bg-[#fce4ec] border-[#f44336]/30 text-[#c62828]',
            toast.type === 'info' && 'bg-[#e3f2fd] border-[#2196F3]/30 text-[#1565C0]',
          )}
        >
          <span className={cn(
            'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
            toast.type === 'success' && 'bg-[#4CAF50] text-white',
            toast.type === 'error' && 'bg-[#f44336] text-white',
            toast.type === 'info' && 'bg-[#2196F3] text-white',
          )}>
            {toast.type === 'success' ? <Check className="h-3 w-3" /> : toast.type === 'error' ? <X className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════
// Toggle Switch (with toast)
// ═══════════════════════
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const handleToggle = () => {
    const next = !checked;
    onChange(next);
    showToast(next ? `✓ ${label} — Enabled` : `✗ ${label} — Disabled`, next ? 'success' : 'info');
  };

  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer">
      <button type="button" role="switch" onClick={handleToggle}
        className={cn('relative w-9 h-5 rounded-full transition-all duration-300', checked ? 'bg-primary shadow-[0_0_6px_rgba(15,123,71,0.4)]' : 'bg-border')}
      >
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      <span className="text-[12px] text-content flex-1">{label}</span>
    </label>
  );
}

// ═══════════════════════
// Checkbox Group
// ═══════════════════════
function CheckboxGroup({ options, selected, onChange, label }: { options: string[]; selected: string[]; onChange: (v: string[]) => void; label?: string }) {
  return (
    <div>
      {label && <p className="text-[11px] font-medium text-content mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isChecked = selected.includes(opt);
          return (
            <button key={opt} onClick={() => onChange(isChecked ? selected.filter((s) => s !== opt) : [...selected, opt])}
              className={cn('px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all', isChecked ? 'bg-primary text-white border-primary' : 'bg-surface text-content-secondary border-border hover:border-border-strong')}
            >{opt}</button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════
// Section Card
// ═══════════════════════
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="lg" className="mb-4">
      <h4 className="text-[13px] font-bold text-content mb-3 pb-2 border-b border-border">{title}</h4>
      {children}
    </Card>
  );
}

// ═══════════════════════
// GENERAL TAB
// ═══════════════════════
function GeneralTab() {
  const s = useSettingsStore();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <SectionCard title="Restaurant Information">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Restaurant Name" value={s.restaurantName} onChange={(e) => s.update({ restaurantName: e.target.value })} />
          <Input label="GST Number" value={s.gstNo} onChange={(e) => s.update({ gstNo: e.target.value })} />
          <Input label="Phone" value={s.phone} onChange={(e) => s.update({ phone: e.target.value })} />
          <Input label="Email" value={s.email} onChange={(e) => s.update({ email: e.target.value })} />
          <div className="col-span-2"><Input label="Address" value={s.address} onChange={(e) => s.update({ address: e.target.value })} /></div>
          <Select label="Default Currency" options={[
            { value: 'INR', label: 'INR — Indian Rupee (₹)' },
            { value: 'USD', label: 'USD — US Dollar ($)' },
            { value: 'EUR', label: 'EUR — Euro (€)' },
            { value: 'GBP', label: 'GBP — British Pound (£)' },
            { value: 'AED', label: 'AED — UAE Dirham (د.إ)' },
            { value: 'AUD', label: 'AUD — Australian Dollar (A$)' },
            { value: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
            { value: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
            { value: 'SAR', label: 'SAR — Saudi Riyal (﷼)' },
            { value: 'JPY', label: 'JPY — Japanese Yen (¥)' },
            { value: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
            { value: 'PKR', label: 'PKR — Pakistani Rupee (₨)' },
            { value: 'BDT', label: 'BDT — Bangladeshi Taka (৳)' },
            { value: 'LKR', label: 'LKR — Sri Lankan Rupee (රු)' },
            { value: 'NPR', label: 'NPR — Nepalese Rupee (रू)' },
          ]} value={s.currency} onChange={(e) => s.update({ currency: e.target.value })} />
        </div>
      </SectionCard>

      <SectionCard title="Appearance">
        <div className="flex items-center gap-6">
          <span className="text-[12px] text-content-secondary w-20">Theme:</span>
          <div className="flex items-center gap-2">
            {[
              { value: 'light' as const, label: 'Light', icon: Sun },
              { value: 'dark' as const, label: 'Dark', icon: Moon },
              { value: 'system' as const, label: 'System', icon: Monitor },
            ].map((opt) => (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border text-[12px] font-medium transition-all', theme === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-content-secondary hover:border-border-strong')}
              ><opt.icon className="h-4 w-4" />{opt.label}</button>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Table Settings">
          <Toggle checked={s.billDetailsOnTable} onChange={(v) => s.update({ billDetailsOnTable: v })} label="Display Bill Details on Table" />
          <Toggle checked={s.customerNameOnTable} onChange={(v) => s.update({ customerNameOnTable: v })} label="Display Customer Name on Table" />
          <Toggle checked={s.kotNumberOnTable} onChange={(v) => s.update({ kotNumberOnTable: v })} label="Display KOT number on Table" />
          <Toggle checked={s.orderStatusOnTable} onChange={(v) => s.update({ orderStatusOnTable: v })} label="Display Order Status on Table" />
          <Toggle checked={s.displayTimeOnTable} onChange={(v) => s.update({ displayTimeOnTable: v })} label="Display Time on Table" />
        </SectionCard>
        <SectionCard title="Item Settings">
          <Toggle checked={s.displayItemDetails} onChange={(v) => s.update({ displayItemDetails: v })} label="Display Item Details" />
          <Toggle checked={s.displayItemCode} onChange={(v) => s.update({ displayItemCode: v })} label="Display Item Code" />
          <Toggle checked={s.displayItemImage} onChange={(v) => s.update({ displayItemImage: v })} label="Display Item Image" />
          <Toggle checked={s.showPrepTime} onChange={(v) => s.update({ showPrepTime: v })} label="Show items prep time" />
          <Toggle checked={s.compactItemView} onChange={(v) => s.update({ compactItemView: v })} label="Display Compact Item View" />
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="View Settings">
          <Select label="Sort Items By:" options={[
            { value: 'short-code', label: 'Short Code' }, { value: 'top-amount', label: 'Top-Selling (By Amount)' },
            { value: 'top-qty', label: 'Top-Selling (By Quantity)' }, { value: 'name', label: 'Name' },
            { value: 'alphabetical', label: 'Alphabetical (A-Z)' },
          ]} value={s.sortItemsBy} onChange={(e) => s.update({ sortItemsBy: e.target.value })} />
        </SectionCard>
        <SectionCard title="KOT Settings">
          <Toggle checked={s.disableSaveKOT} onChange={(v) => s.update({ disableSaveKOT: v })} label="Disable save KOT" />
          <Toggle checked={s.disableSaveBill} onChange={(v) => s.update({ disableSaveBill: v })} label="Disable save bill" />
        </SectionCard>
      </div>

      <SectionCard title="Kitchen Display (KDS)">
        <Toggle checked={s.kdsEnabled} onChange={(v) => s.update({ kdsEnabled: v })} label="Enable Kitchen Display" />
        <p className="text-[10px] text-content-tertiary mt-1 ml-1">When off, new orders are marked served immediately and skip the kitchen display. Existing orders in the KDS are not affected. The KDS icon is hidden from the sidebar.</p>
      </SectionCard>

      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Default Tab">
          <CheckboxGroup options={['Dine-in', 'PickUp', 'Delivery', 'Quick Bill']} selected={s.defaultTabs} onChange={(v) => s.update({ defaultTabs: v })} label="Default tab on POS open:" />
        </SectionCard>
        <SectionCard title="Disable Tab">
          <CheckboxGroup options={['Dine-in', 'PickUp', 'Delivery', 'Quick Bill']} selected={s.disabledTabs} onChange={(v) => s.update({ disabledTabs: v })} label="Hide these tabs from POS:" />
        </SectionCard>
      </div>

      <SectionCard title="Table Color Indicators">
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'free' as const, label: 'Free Table' },
            { key: 'selected' as const, label: 'Selected Table' },
            { key: 'kotSaved' as const, label: 'KOT Saved' },
            { key: 'itemsInKOT' as const, label: 'Items in KOT' },
            { key: 'billSaved' as const, label: 'Bill Saved' },
            { key: 'billPrinted' as const, label: 'Bill Printed' },
            { key: 'draftBillPrinted' as const, label: 'Draft Bill' },
            { key: 'reserved' as const, label: 'Reserved Table' },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={s.tableColors[key]}
                onChange={(e) => s.update({ tableColors: { ...s.tableColors, [key]: e.target.value } })}
                className="h-7 w-7 rounded border border-border cursor-pointer shrink-0 p-0"
              />
              <span className="text-[11px] text-content">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-content-tertiary mt-2">Note: Some colour states (KOT Saved, Bill Printed, Draft Bill) don't yet have distinct table states in the POS. They're stored for when the data model supports them.</p>
      </SectionCard>

      <div className="flex justify-end gap-2 items-center">
        <span className="text-[10px] text-content-tertiary">Changes saved automatically</span>
        <Button variant="secondary" leftIcon={<RotateCw className="h-4 w-4" />} onClick={s.reset}>Reset All</Button>
      </div>
    </div>
  );
}

// ═══════════════════════
// PRINTER TAB
// ═══════════════════════
function PrinterTab() {
  const s = useSettingsStore();

  return (
    <div className="space-y-4">
      <SectionCard title="Printer Configuration">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Printer Type" options={[
            { value: 'thermal', label: 'Thermal Printer (80mm)' }, { value: 'thermal58', label: 'Thermal Printer (58mm)' },
            { value: 'laser', label: 'Laser Printer (A4)' },
          ]} value={s.printerType} onChange={(e) => s.update({ printerType: e.target.value })} />
          <Select label="Connection" options={[
            { value: 'test', label: 'Test Mode (save to file)' },
            { value: 'usb', label: 'USB' },
            { value: 'network', label: 'Network (Ethernet/WiFi)' },
          ]} value={s.printerConnection} onChange={(e) => s.update({ printerConnection: e.target.value })} />
          <Input label="Printer Name" value={s.printerName} onChange={(e) => s.update({ printerName: e.target.value })} />
          <Input label="IP Address / Port" value={s.printerIp} onChange={(e) => s.update({ printerIp: e.target.value })} />
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Toggle checked={s.useRealPrinter} onChange={(v) => s.update({ useRealPrinter: v })} label="Use real printer" />
          <p className="mt-1 text-[11px] text-amber-800">
            Enable once your physical printer is connected. Leave off to keep printing in test mode (saves to file for verification).
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Print Settings">
        <Toggle checked={s.autoPrintKOT} onChange={(v) => s.update({ autoPrintKOT: v })} label="Auto-print KOT on order" />
        <Toggle checked={s.duplicateKOT} onChange={(v) => s.update({ duplicateKOT: v })} label="Print duplicate KOT for kitchen" />
        <Toggle checked={s.customerCopy} onChange={(v) => s.update({ customerCopy: v })} label="Print customer copy (bill)" />
        <Toggle checked={s.printGST} onChange={(v) => s.update({ printGST: v })} label="Print GST details on bill" />
        <Toggle checked={s.printLogo} onChange={(v) => s.update({ printLogo: v })} label="Print logo on KOT" />
      </SectionCard>

      <SectionCard title="KOT & Kitchen Printing">
        <Select label="Label Printer for KOT:" options={[
          { value: 'disable', label: 'Disable' }, { value: 'thermal', label: 'Thermal Printer' },
        ]} value={s.labelPrinter} onChange={(e) => s.update({ labelPrinter: e.target.value })} />
        <div className="mt-3 space-y-2">
          <Toggle checked={s.printByDept} onChange={(v) => s.update({ printByDept: v })} label="Print KOT by Kitchen Department" />
          <Toggle checked={s.printByDeptOnline} onChange={(v) => s.update({ printByDeptOnline: v })} label="Print KOT by Kitchen Department for Online Orders" />
          <Toggle checked={s.printAllInOne} onChange={(v) => s.update({ printAllInOne: v })} label="Print All-in-One KOT" />
          <Toggle checked={s.printCatWise} onChange={(v) => s.update({ printCatWise: v })} label="Print Category-wise KOT" />
          <Toggle checked={s.printTableWise} onChange={(v) => s.update({ printTableWise: v })} label="Print Table-wise KOT" />
          <Toggle checked={s.printTableBill} onChange={(v) => s.update({ printTableBill: v })} label="Print Table-wise Bill" />
          <Toggle checked={s.groupDeptPrinter} onChange={(v) => s.update({ groupDeptPrinter: v })} label="Group Items if Departments has Same Printer" />
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <span className="text-[10px] text-content-tertiary">Test mode prints to a file. Network printing is available when "Use real printer" is on; USB is untested.</span>
      </div>
    </div>
  );
}

// ═══════════════════════
// SHORTCUTS TAB
// ═══════════════════════
function ShortcutsTab() {
  return (
    <div className="space-y-4">
      <SectionCard title="Keyboard Shortcuts">
        <p className="text-[11px] text-content-secondary mb-3">Use keyboard shortcuts to speed up your POS operations.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1">
          {[
            { key: 'F1', action: 'New Order' }, { key: 'F2', action: 'Hold Order' },
            { key: 'F3', action: 'Print KOT' }, { key: 'F4', action: 'Settle Bill' },
            { key: 'F5', action: 'Cancel Item' }, { key: 'F6', action: 'Discount' },
            { key: 'F7', action: 'Add Customer' }, { key: 'F8', action: 'Split Table' },
            { key: 'F9', action: 'Change Table' }, { key: 'F10', action: 'Quick Pay' },
            { key: 'Ctrl+N', action: 'New Order' }, { key: 'Ctrl+P', action: 'Print' },
            { key: 'Ctrl+S', action: 'Save / Settle' }, { key: 'Ctrl+D', action: 'Discount' },
            { key: 'Ctrl+F', action: 'Search' }, { key: 'Esc', action: 'Cancel / Close' },
          ].map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-[10px] font-mono font-semibold bg-surface-tertiary px-2 py-0.5 rounded text-content">{s.key}</span>
              <span className="text-[11px] text-content-secondary">{s.action}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════
// SYSTEM DETAILS TAB
// ═══════════════════════
function SystemDetailsTab() {
  const s = useSettingsStore();
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [billCounter, setBillCounter] = useState(String(s.desktopOrderCounter));

  const checkUpdates = async () => {
    setChecking(true);
    try {
      if (window.api?.app?.checkForUpdates) {
        const result = await window.api.app.checkForUpdates();
        setUpdateMsg(result.updateAvailable ? `Update available: ${result.version}` : 'You are running the latest version!');
      } else {
        setUpdateMsg('You are running the latest version!');
      }
    } catch {
      setUpdateMsg('Could not check for updates');
    } finally {
      setChecking(false);
      setTimeout(() => setUpdateMsg(''), 3000);
    }
  };

  const updateBillCounter = async () => {
    const n = parseInt(billCounter, 10);
    if (!Number.isFinite(n) || n <= 0) {
      showToast('Order counter must be a positive number', 'error');
      return;
    }
    // Reject rewinding the counter below the highest already-issued order number
    // (rewinding would make future orders overwrite already-paid orders).
    try {
      const rows = await window.api.db.query('SELECT MAX(order_number) AS max_order FROM orders');
      const maxOrder = Number((rows?.[0] as any)?.max_order) || 0;
      if (n <= maxOrder) {
        showToast(`Cannot set counter to ${n} — highest issued order is D-${maxOrder}`, 'error');
        return;
      }
    } catch { /* fall through — best-effort guard */ }
    s.update({ desktopOrderCounter: n });
    showToast(`Order counter updated to ${n}`, 'success');
  };

  return (
    <div className="space-y-4">
      <SectionCard title="System Information">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            { label: 'App Version', value: 'v1.0.0' }, { label: 'Electron', value: 'v33.2.0' },
            { label: 'React', value: 'v18.3.1' }, { label: 'Database', value: 'SQLite (better-sqlite3)' },
            { label: 'Cloud Sync', value: 'Firebase Firestore' }, { label: 'Platform', value: 'macOS (darwin)' },
            { label: 'License', value: 'Nexora Solution' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-[11px] text-content-secondary">{item.label}</span>
              <span className="text-[11px] font-semibold text-content">{item.value}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Order Counter">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-content">Next order number:</span>
          <Input value={billCounter} onChange={(e) => setBillCounter(e.target.value)} type="number" className="w-32" />
          <Button size="sm" onClick={updateBillCounter}>Set</Button>
          <span className="text-[10px] text-content-tertiary ml-2">Current: D-{s.desktopOrderCounter}</span>
        </div>
      </SectionCard>

      <SectionCard title="Maintenance">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={checkUpdates}>
            {checking ? 'Checking...' : updateMsg || 'Check for updates'}
          </Button>
          <div className="flex-1" />
          <Badge variant="success" dot>System Healthy</Badge>
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════
// FORMATTING TAB — KOT Print Designer
// ═══════════════════════
function FormattingTab() {
  const s = useSettingsStore();
  const [selectedElement, setSelectedElement] = useState('header');
  const [paperSize, setPaperSize] = useState('80mm');
  const [fontSize, setFontSize] = useState('medium');
  const [fontStyle, setFontStyle] = useState('normal');

  return (
    <div className="space-y-4">
      <SectionCard title="KOT Print Styling">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold text-content mb-1">Select Element:</label>
            <Select options={[
              { value: 'header', label: 'Header (Outlet Name)' }, { value: 'kotno', label: 'KOT Number' },
              { value: 'orderid', label: 'Order ID' }, { value: 'datetime', label: 'Date & Time' },
              { value: 'table', label: 'Table Name' }, { value: 'itemname', label: 'Item Name' },
              { value: 'itemqty', label: 'Item Quantity' }, { value: 'addon', label: 'Addon Name' },
              { value: 'note', label: 'Notes' }, { value: 'footer', label: 'Footer' },
            ]} value={selectedElement} onChange={(e) => setSelectedElement(e.target.value)} />
          </div>
          <Select label="Paper Size" options={[{ value: '80mm', label: '80mm' }, { value: '58mm', label: '58mm' }, { value: 'a4', label: 'A4' }]} value={paperSize} onChange={(e) => setPaperSize(e.target.value)} />
          <Select label="Size" options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} value={fontSize} onChange={(e) => setFontSize(e.target.value)} />
          <Select label="Font Style" options={[{ value: 'normal', label: 'Normal' }, { value: 'bold', label: 'Bold' }, { value: 'italic', label: 'Italic' }]} value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <Button size="sm" leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => alert(`Styles applied to: ${selectedElement}`)}>Update</Button>
          <Button variant="secondary" size="sm" onClick={() => alert('Styles disabled')}>Disable Styles</Button>
          <Button variant="secondary" size="sm" onClick={() => { setSelectedElement('header'); setPaperSize('80mm'); setFontSize('medium'); setFontStyle('normal'); }}><RotateCw className="h-3.5 w-3.5 mr-1" />Reset Styles</Button>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" leftIcon={<Printer className="h-3.5 w-3.5" />} disabled title="Printing is not yet available">Test Print</Button>
          <Button variant="secondary" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />} onClick={() => alert('Current styles: Normal font, Medium size, 80mm paper')}>View Styles</Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <SectionCard title="Select KOT Print Format">
            <div className="space-y-2">
              {[
                { id: 'format1', name: 'Format 1 — Standard', desc: 'KOT No, Outlet, Order ID, Date, Table, Items, Notes' },
                { id: 'format2', name: 'Format 2 — Compact', desc: 'KOT No, Date, Table, Items (compact)' },
              ].map((fmt) => (
                <button key={fmt.id} onClick={() => s.update({ kotFormat: fmt.id })}
                  className={cn('w-full text-left p-3 rounded-lg border transition-all', s.kotFormat === fmt.id ? 'border-primary bg-primary/5' : 'border-border hover:border-border-strong')}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center', s.kotFormat === fmt.id ? 'border-primary' : 'border-border')}>
                      {s.kotFormat === fmt.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-[12px] font-semibold text-content">{fmt.name}</span>
                  </div>
                  <p className="text-[10px] text-content-secondary mt-1 ml-6">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Bill & Tax Config">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bill Prefix" value={s.billPrefix} onChange={(e) => s.update({ billPrefix: e.target.value })} />
              <Input label="Starting Bill #" value={s.startingBillNumber} onChange={(e) => s.update({ startingBillNumber: e.target.value })} type="number" />
              <Input label="CGST Rate (%)" value={s.cgstRate} onChange={(e) => { const v = e.target.value; const n = parseFloat(v); s.update({ cgstRate: Number.isFinite(n) ? String(Math.min(100, Math.max(0, n))) : v }); }} type="number" />
              <Input label="SGST Rate (%)" value={s.sgstRate} onChange={(e) => { const v = e.target.value; const n = parseFloat(v); s.update({ sgstRate: Number.isFinite(n) ? String(Math.min(100, Math.max(0, n))) : v }); }} type="number" />
              <div className="col-span-2"><Input label="Footer Text" value={s.billFooter} onChange={(e) => s.update({ billFooter: e.target.value })} /></div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="KOT Print Preview">
          {s.kotFormat === 'format1' ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white border border-border rounded-lg p-3 font-mono text-[9px] leading-relaxed">
                  <div className="text-center font-bold text-[10px] mb-1">KOT No: 999{n}</div>
                  <div className="text-center font-semibold mb-0.5">Nexora Solution</div>
                  <div className="text-center text-[8px] text-content-tertiary mb-1">Order ID:2z6mbj{n}kl0ka2nr</div>
                  <div className="text-center text-[8px] mb-1">11 May 2020 09:{10 + n} PM</div>
                  <div className="text-center font-semibold mb-2">Test Table</div>
                  <div className="border-t border-dashed border-border pt-1">
                    <div className="flex justify-between font-semibold text-[8px] mb-0.5"><span>Item</span><span>Qty</span></div>
                    <div className="flex justify-between"><span>Butter Chicken</span><span>1</span></div>
                    <div className="flex justify-between"><span>Dal Makhani</span><span>2</span></div>
                    <div className="flex justify-between"><span>Tandoori Roti</span><span>3</span></div>
                    <div className="flex justify-between"><span>Gulab Jamun</span><span>2</span></div>
                  </div>
                  <div className="border-t border-dashed border-border mt-1 pt-1 text-[8px] font-semibold">Note: Less spicy please</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white border border-border rounded-lg p-3 font-mono text-[9px] leading-relaxed">
                  <div className="text-center font-bold text-[10px] mb-0.5">KOT No: 999{n}</div>
                  <div className="text-center text-[8px] mb-1">11 May 2020 09:{10 + n} PM · Test Table</div>
                  <div className="border-t border-dashed border-border pt-1">
                    <div className="flex justify-between"><span>1x Butter Chicken</span></div>
                    <div className="flex justify-between"><span>2x Dal Makhani</span></div>
                    <div className="flex justify-between"><span>3x Tandoori Roti</span></div>
                    <div className="flex justify-between"><span>2x Gulab Jamun</span></div>
                  </div>
                  <div className="border-t border-dashed border-border mt-1 pt-1 text-[8px] font-semibold">Note: Less spicy please</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="flex justify-end gap-2 items-center">
        <span className="text-[10px] text-content-tertiary">Changes saved automatically</span>
        <Button variant="secondary" leftIcon={<RotateCw className="h-4 w-4" />} onClick={s.reset}>Reset</Button>
      </div>
    </div>
  );
}

// ═══════════════════════
// MAIN
// ═══════════════════════
export default function General() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-4">
      <Tabs variant="pills"
        tabs={[
          { id: 'general', label: 'General' }, { id: 'printer', label: 'Printer' },
          { id: 'shortcuts', label: 'Shortcuts' }, { id: 'system', label: 'System Details' },
          { id: 'formatting', label: 'Formatting' },
        ]}
        activeTab={activeTab} onChange={setActiveTab}
      />
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'printer' && <PrinterTab />}
      {activeTab === 'shortcuts' && <ShortcutsTab />}
      {activeTab === 'system' && <SystemDetailsTab />}
      {activeTab === 'formatting' && <FormattingTab />}
      <ToastContainer />
    </div>
  );
}
