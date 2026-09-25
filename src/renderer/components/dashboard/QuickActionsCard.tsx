import { Plus, LayoutGrid, ChefHat, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { focusRing } from './primitives';

export interface QuickActionsCardProps {
  onNavigate: (path: string) => void;
  /** Hides the Kitchen tile when the KDS is switched off in settings. */
  kdsEnabled: boolean;
  /** Today's open kitchen tickets; null renders the generic subtitle. */
  kitchenTickets: number | null;
  className?: string;
}

interface Tile {
  label: string;
  hint: string;
  icon: LucideIcon;
  path: string;
  primary?: boolean;
}

export function QuickActionsCard({ onNavigate, kdsEnabled, kitchenTickets, className }: QuickActionsCardProps) {
  const tiles: Tile[] = [
    { label: 'New order', hint: 'F2', icon: Plus, path: '/billing', primary: true },
    { label: 'Tables', hint: 'Seat & clear', icon: LayoutGrid, path: '/tables' },
    ...(kdsEnabled
      ? [{
          label: 'Kitchen',
          hint: kitchenTickets !== null ? `${kitchenTickets} tickets waiting` : 'Kitchen queue',
          icon: ChefHat,
          path: '/kitchen',
        } as Tile]
      : []),
    { label: 'Reports', hint: 'Sales & staff', icon: BarChart3, path: '/reports' },
  ];

  return (
    <section className={cn('flex flex-col rounded-card bg-pos-deep p-[14px] 2xl:p-[18px]', className)}>
      <h3 className="text-[14px] font-semibold text-white">Quick actions</h3>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {tiles.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => onNavigate(t.path)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-tile p-3 text-left transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-pos-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pos-deep',
              t.primary
                ? 'bg-pos-lime hover:bg-pos-lime/90'
                : 'bg-pos-deep-tile border border-pos-deep-border hover:border-pos-lime/50',
            )}
          >
            <t.icon
              className={cn('h-[18px] w-[18px]', t.primary ? 'text-pos-deep' : 'text-pos-lime')}
              aria-hidden="true"
            />
            <span className="min-w-0 w-full">
              <span className={cn('block truncate text-[12px] font-bold', t.primary ? 'text-pos-deep' : 'text-white')}>
                {t.label}
              </span>
              <span className={cn('block truncate text-[10px]', t.primary ? 'text-pos-deep/70' : 'text-pos-on-deep')}>
                {t.hint}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
