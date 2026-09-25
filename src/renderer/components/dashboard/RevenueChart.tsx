import { useMemo, useState } from 'react';
import { cn } from '@/utils/cn';
import type { ChartBucket, Granularity } from '@/hooks/useDashboardMetrics';
import { Card, EmptyNote } from './primitives';
import { useDashboardFormat } from './format';

export interface RevenueChartProps {
  buckets: ChartBucket[];
  granularity: Granularity;
  /** Busiest column; drives the subtitle. */
  peak: { label: string; revenue: number } | null;
  /** Today only: highlights the live hour and pads with upcoming slots. */
  isToday: boolean;
  hasOrders: boolean;
  className?: string;
}

const MIN_WINDOW = 11;
const LOOKAHEAD = 6;

const TITLES: Record<Granularity, string> = {
  hour: 'Revenue by hour',
  day: 'Revenue by day',
  week: 'Revenue by week',
  month: 'Revenue by month',
};

/**
 * Today only: from the first hour with sales (padded by one) through at least
 * the current hour plus LOOKAHEAD, never narrower than MIN_WINDOW. Every other
 * period shows its columns in full.
 */
function todayWindow(buckets: ChartBucket[], currentHour: number): { start: number; end: number } {
  const busy = buckets.map((b, i) => ({ i, live: b.revenue > 0 })).filter((b) => b.live).map((b) => b.i);
  let start = busy.length > 0 ? Math.max(0, Math.min(...busy) - 1) : Math.max(0, currentHour - 2);
  let end = Math.min(23, Math.max(currentHour + LOOKAHEAD, busy.length > 0 ? Math.max(...busy) + 1 : 0));

  while (end - start + 1 < MIN_WINDOW && (start > 0 || end < 23)) {
    if (end < 23) end += 1;
    if (end - start + 1 < MIN_WINDOW && start > 0) start -= 1;
  }
  return { start, end };
}

export function RevenueChart({
  buckets, granularity, peak, isToday, hasOrders, className,
}: RevenueChartProps) {
  const { formatMoney, formatMoneyCompact, formatNumber } = useDashboardFormat();
  const [hovered, setHovered] = useState<number | null>(null);

  const currentHour = new Date().getHours();
  const isTodayHourly = isToday && granularity === 'hour';

  const slice = useMemo(() => {
    if (!isTodayHourly) return buckets;
    const { start, end } = todayWindow(buckets, currentHour);
    return buckets.slice(start, end + 1);
  }, [buckets, isTodayHourly, currentHour]);

  const peakValue = Math.max(...slice.map((b) => b.revenue), 1);
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  // Beyond ~31 columns the labels collide, so thin the axis instead.
  const labelStep = Math.max(1, Math.ceil(slice.length / 12));
  const dense = slice.length > 31;

  const unit = granularity === 'hour' ? 'hour' : granularity;

  return (
    <Card className={cn('flex flex-col p-[14px] 2xl:p-[18px]', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-pos-ink">{TITLES[granularity]}</h3>
          {peak ? (
            <p className="mt-0.5 text-[11px] text-pos-muted truncate">
              {isToday ? 'Peak so far' : 'Peak'}: {peak.label.toLowerCase()} · {formatMoney(peak.revenue)}
            </p>
          ) : null}
        </div>
        <ul className="flex items-center gap-4">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-pos-primary" aria-hidden="true" />
            <span className="text-[11px] text-pos-muted">Completed {unit}</span>
          </li>
          {isTodayHourly && (
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-pos-lime-border bg-pos-lime" aria-hidden="true" />
              <span className="text-[11px] text-pos-muted">Current hour</span>
            </li>
          )}
        </ul>
      </div>

      {!hasOrders || slice.length === 0 ? (
        <EmptyNote>No sales in this period</EmptyNote>
      ) : (
        <div className="mt-4 flex gap-2.5">
          <ul className="flex w-12 shrink-0 flex-col justify-between py-0 text-right" aria-hidden="true">
            {ticks.map((t) => (
              <li key={t} className="text-[11px] leading-none tabular-nums text-pos-muted">
                {formatMoneyCompact(peakValue * t)}
              </li>
            ))}
          </ul>

          <div className="relative min-w-0 flex-1">
            <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {ticks.map((t) => (
                <span key={t} className={cn('h-px w-full', t === 0 ? 'bg-pos-axis' : 'bg-pos-grid')} />
              ))}
            </div>

            <div className={cn('relative flex h-[168px] 2xl:h-[204px] items-end', dense ? 'gap-px' : 'gap-1')}>
              {slice.map((b, i) => {
                const isNow = isTodayHourly && b.hour === currentHour;
                const isFuture = isTodayHourly && (b.hour ?? 0) > currentHour;
                const pct = Math.min((b.revenue / peakValue) * 100, 100);
                const label = `${b.label.toLowerCase()} · ${formatMoney(b.revenue)} · ${formatNumber(b.orders)} orders`;

                return (
                  <div
                    key={b.key}
                    className="group relative flex h-full min-w-0 flex-1 items-end"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {isFuture && b.revenue === 0 ? (
                      <span
                        className="w-full rounded-t-[4px] border border-dashed border-pos-axis"
                        style={{ height: '18px' }}
                        title={`${b.label.toLowerCase()} · upcoming`}
                      />
                    ) : (
                      <span
                        className={cn(
                          'w-full rounded-t-[4px] transition-colors',
                          isNow ? 'border border-pos-lime-border bg-pos-lime' : 'bg-pos-primary',
                          !isNow && hovered === i && 'bg-pos-primary-dark',
                        )}
                        style={{ height: `${Math.max(pct, b.revenue > 0 ? 3 : 0)}%` }}
                        title={label}
                      />
                    )}

                    {hovered === i && b.revenue > 0 && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-btn bg-pos-deep px-2.5 py-1.5 text-[11px] font-medium tabular-nums text-white shadow-dropdown">
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <ul className={cn('mt-2 flex', dense ? 'gap-px' : 'gap-1')}>
              {slice.map((b, i) => (
                <li
                  key={b.key}
                  className={cn(
                    'min-w-0 flex-1 overflow-hidden text-center text-[11px] tabular-nums whitespace-nowrap',
                    isTodayHourly && b.hour === currentHour ? 'font-bold text-pos-ink' : 'text-pos-muted',
                  )}
                >
                  {i % labelStep === 0
                    ? (granularity === 'hour' ? b.label.replace('AM', 'a').replace('PM', 'p') : b.label)
                    : ' '}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
