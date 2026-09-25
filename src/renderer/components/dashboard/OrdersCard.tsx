import { ClipboardList } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { OrderTypeSlice } from '@/hooks/useDashboardMetrics';
import { Card } from './primitives';
import { useDashboardFormat } from './format';

export interface OrdersCardProps {
  totalOrderCount: number;
  paidCount: number;
  cancelledCount: number;
  /** Empty array hides the split bar and legend. */
  orderTypeSplit: OrderTypeSlice[];
  className?: string;
}

// Three tints so the split bar reads without inventing new brand colours.
const FILLS = ['bg-pos-primary', 'bg-pos-mid', 'bg-pos-pale'];
const DOTS = ['bg-pos-primary', 'bg-pos-mid', 'bg-pos-pale'];

export function OrdersCard({
  totalOrderCount, paidCount, cancelledCount, orderTypeSplit, className,
}: OrdersCardProps) {
  const { formatNumber } = useDashboardFormat();
  const slices = orderTypeSplit.slice(0, 3);

  return (
    <Card className={cn('flex flex-col p-[14px] 2xl:p-[18px]', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pos-muted">Orders</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-tile bg-pos-primary-soft" aria-hidden="true">
          <ClipboardList className="h-4 w-4 text-pos-primary" />
        </span>
      </div>

      <p className="mt-2 font-display text-[26px] font-bold leading-none tabular-nums text-pos-ink">
        {formatNumber(totalOrderCount)}
      </p>
      <p className="mt-1.5 text-[12px] text-pos-muted">
        {formatNumber(paidCount)} paid · {formatNumber(cancelledCount)} cancelled
      </p>

      {slices.length > 0 && (
        <div className="mt-auto pt-4">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-pos-divider" aria-hidden="true">
            {slices.map((s, i) => (
              <div key={s.label} className={cn('h-full', FILLS[i])} style={{ width: `${s.share * 100}%` }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {slices.map((s, i) => (
              <li key={s.label} className="flex min-w-0 items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-[3px]', DOTS[i])} aria-hidden="true" />
                <span className="truncate text-[12px] text-pos-muted" title={s.label}>{s.label}</span>
                <span className="text-[12px] font-semibold tabular-nums text-pos-ink">{formatNumber(s.count)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
