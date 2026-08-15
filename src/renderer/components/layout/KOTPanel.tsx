import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useSettingsStore } from '@/stores/settings-store';
import { getCurrencySymbol } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Coffee,
  UtensilsCrossed,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface KOTItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  variant?: string;
}

interface KOTPanelProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  orderNumber?: string;
  tableName?: string;
  items?: KOTItem[];
}

const sampleItems: KOTItem[] = [
  { id: '1', name: 'Butter Chicken', qty: 2, price: 550 },
  { id: '2', name: 'Garlic Naan', qty: 3, price: 55 },
  { id: '3', name: 'Dal Makhani', qty: 1, price: 320 },
  { id: '4', name: 'Jeera Rice', qty: 1, price: 180 },
  { id: '5', name: 'Green Salad', qty: 2, price: 120 },
  { id: '6', name: 'Mango Lassi', qty: 2, price: 120, variant: 'Sweet' },
];

export function KOTPanel({
  open,
  onClose,
  className,
  orderNumber = 'KOT #1047',
  tableName = 'Table 5',
  items = sampleItems,
}: KOTPanelProps) {
  const currSymbol = useCurrencySymbol();
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const cgst = Math.round(subtotal * 0.025);
  const sgst = Math.round(subtotal * 0.025);
  const total = subtotal + cgst + sgst;

  if (!open) return null;

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 bottom-0 z-[var(--z-right-panel)]',
        'w-right-panel bg-surface border-l border-border shadow-panel',
        'flex flex-col',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-header border-b border-border shrink-0 bg-primary">
        <div>
          <h2 className="text-sm font-bold text-white">{orderNumber}</h2>
          <p className="text-[11px] text-white/80 mt-0.5">{tableName} • Dine-in</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-stretch border-b border-border shrink-0">
        {[
          { label: 'Dine-in', icon: UtensilsCrossed, active: true },
          { label: 'Takeaway', icon: ShoppingBag, active: false },
          { label: 'Bar', icon: Coffee, active: false },
        ].map((tab) => (
          <button
            key={tab.label}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-colors border-b-2',
              tab.active
                ? 'text-primary border-primary bg-primary-light/50'
                : 'text-content-tertiary border-transparent hover:text-content-secondary hover:bg-surface-tertiary',
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Waiter & Info */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-secondary shrink-0">
        <div className="flex items-center gap-2 text-[11px] text-content-secondary">
          <span>Waiter: <span className="font-medium text-content">Rahul S.</span></span>
          <span className="text-border-strong">|</span>
          <span>Guests: <span className="font-medium text-content">4</span></span>
        </div>
        <button className="text-[11px] text-primary font-medium hover:underline">
          Change
        </button>
      </div>

      {/* Order Items */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface hover:bg-surface-secondary border border-border/50 transition-colors group"
            >
              {/* Qty controls */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button className="h-6 w-6 flex items-center justify-center rounded border border-border text-content-tertiary hover:text-content hover:bg-surface-tertiary transition-colors">
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">{item.qty}</span>
                <button className="h-6 w-6 flex items-center justify-center rounded border border-border text-content-tertiary hover:text-content hover:bg-surface-tertiary transition-colors">
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-content leading-tight truncate">
                  {item.name}
                </p>
                {item.variant && (
                  <p className="text-[11px] text-content-tertiary">{item.variant}</p>
                )}
              </div>

              {/* Price & delete */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] font-semibold tabular-nums">{currSymbol}{item.qty * item.price}</span>
                <button className="opacity-0 group-hover:opacity-100 text-content-tertiary hover:text-danger transition-all">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Item Button */}
        <div className="px-3 pb-3">
          <button className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-xs font-medium text-content-tertiary hover:text-content-secondary hover:border-border-strong hover:bg-surface-secondary transition-colors flex items-center justify-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="border-t border-border shrink-0 bg-surface-secondary">
        <div className="px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-[12px]">
            <span className="text-content-secondary">Subtotal</span>
            <span className="font-medium tabular-nums">{currSymbol}{subtotal}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-content-secondary">CGST (2.5%)</span>
            <span className="font-medium tabular-nums">{currSymbol}{cgst}</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-content-secondary">SGST (2.5%)</span>
            <span className="font-medium tabular-nums">{currSymbol}{sgst}</span>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-2 pt-1">
            <button className="text-[11px] text-primary font-medium hover:underline">
              + Add Discount
            </button>
            <button className="text-[11px] text-primary font-medium hover:underline">
              + Add Charges
            </button>
          </div>

          <Separator />

          <div className="flex justify-between text-[15px] font-bold pt-0.5">
            <span>Total</span>
            <span className="tabular-nums">{currSymbol}{total}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Printer className="h-3.5 w-3.5" />}
              className="text-[11px]"
            >
              Print KOT
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="text-[11px]"
            >
              Hold Order
            </Button>
          </div>
          <Button className="w-full h-10 text-[13px] font-bold" size="lg">
            Place Order • {currSymbol}{total}
          </Button>
        </div>
      </div>
    </aside>
  );
}
