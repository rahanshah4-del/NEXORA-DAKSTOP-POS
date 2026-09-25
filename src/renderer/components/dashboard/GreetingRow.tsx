import { RotateCw, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { focusRing } from './primitives';
import { useDashboardFormat } from './format';

export type DashboardPeriod = 'today' | 'yesterday' | '7d' | '30d' | 'all';

export const PERIODS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
];

export interface GreetingRowProps {
  firstName: string;
  /** Re-rendered on the clock tick so the time stays live. */
  now: Date;
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onNewOrder: () => void;
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function GreetingRow({
  firstName, now, period, onPeriodChange, isLoading, onRefresh, onNewOrder,
}: GreetingRowProps) {
  const { formatDate, formatTime } = useDashboardFormat();

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pos-primary">
          {formatDate(now)} · {formatTime(now)}
        </p>
        <h1 className="mt-0.5 font-display text-[22px] 2xl:text-[28px] font-bold leading-none tracking-tight text-pos-ink truncate" title={firstName}>
          {greetingFor(now.getHours())}, {firstName}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div
          role="group"
          aria-label="Date range"
          className="flex h-[32px] shrink-0 items-center gap-0.5 rounded-btn border border-pos-card-border bg-pos-card p-1"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              aria-pressed={period === p.id}
              className={cn(
                'flex h-[24px] shrink-0 items-center whitespace-nowrap rounded-[7px] px-2 text-[11px] font-medium transition-colors', focusRing,
                period === p.id ? 'bg-pos-ground text-pos-ink font-semibold' : 'text-pos-muted hover:text-pos-ink',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh dashboard data"
          className={cn(
            'flex h-[32px] w-[32px] items-center justify-center rounded-btn border border-pos-card-border bg-pos-card',
            'text-pos-muted hover:text-pos-ink transition-colors disabled:opacity-50', focusRing,
          )}
        >
          <RotateCw className={cn('h-4 w-4', isLoading && 'animate-spin')} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onNewOrder}
          className={cn(
            'inline-flex h-[32px] items-center gap-1.5 rounded-btn bg-pos-primary px-3.5',
            'text-[12px] font-semibold text-white hover:bg-pos-primary-dark transition-colors', focusRing,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New order
        </button>
      </div>
    </div>
  );
}
