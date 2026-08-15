import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  RotateCw,
  Printer,
  ListFilter,
  Search,
  CreditCard,
  MinusCircle,
} from 'lucide-react';

interface BottomToolbarProps {
  className?: string;
  selectedCount?: number;
  onNewOrder?: () => void;
  onVoid?: () => void;
  onSettle?: () => void;
  onPrint?: () => void;
}

export function BottomToolbar({
  className,
  selectedCount = 0,
  onNewOrder,
  onVoid,
  onSettle,
  onPrint,
}: BottomToolbarProps) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between h-bottom-bar px-4 bg-accent shrink-0 select-none',
        className,
      )}
    >
      {/* Left actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewOrder}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-white text-accent rounded-md hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New Order
        </button>
        <button
          onClick={onVoid}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <MinusCircle className="h-3.5 w-3.5" />
          Cancel Order
        </button>
        <button
          onClick={onPrint}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
      </div>

      {/* Center info */}
      <div className="flex items-center gap-4 text-xs text-white/70">
        <button className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <Search className="h-3.5 w-3.5" />
          <span>Find Table</span>
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <ListFilter className="h-3.5 w-3.5" />
          <span>Filter</span>
        </button>
        <button className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
          <RotateCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {selectedCount > 0 && (
          <span className="text-xs text-white/80">
            {selectedCount} table{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}
        <button
          onClick={onSettle}
          className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold bg-white text-accent rounded-md hover:bg-gray-100 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Settle Payment
        </button>
      </div>
    </footer>
  );
}
