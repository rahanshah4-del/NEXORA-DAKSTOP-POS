import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PaymentMixSlice } from '@/hooks/useDashboardMetrics';
import { useDashboardFormat } from './format';

export interface HeroRevenueCardProps {
  /** Period-aware heading, e.g. "Revenue · last 7 days". */
  label: string;
  /** Set when the fetch hit its cap, so the figure is a partial total. */
  truncatedNote?: string;
  revenue: number;
  paidCount: number;
  avgOrderValue: number;
  cancelledCount: number;
  /** null hides the comparison chip (no yesterday data, or yesterday was zero). */
  changeVsYesterday: number | null;
  /** Empty array hides the payment-mix column entirely. */
  paymentMix: PaymentMixSlice[];
  className?: string;
}

export function HeroRevenueCard({
  label, truncatedNote, revenue, paidCount, avgOrderValue, cancelledCount, changeVsYesterday, paymentMix, className,
}: HeroRevenueCardProps) {
  const { formatMoney, formatNumber, currencySymbol } = useDashboardFormat();

  // formatMoney returns "Rs 12,500"; the hero shows the symbol at a smaller
  // size beside the number, so strip the leading symbol from the amount.
  const full = formatMoney(revenue);
  const amount = full.startsWith(currencySymbol) ? full.slice(currencySymbol.length).trim() : full;

  const up = (changeVsYesterday ?? 0) >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  const stats = [
    { label: 'Paid orders', value: formatNumber(paidCount) },
    { label: 'Avg. order', value: formatMoney(avgOrderValue) },
    { label: 'Cancelled', value: formatNumber(cancelledCount) },
  ];

  return (
    <section className={cn('flex gap-[14px] rounded-card bg-pos-deep p-[14px] 2xl:p-[18px] text-white', className)}>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-pos-on-deep">{label}</p>

        <div className="mt-1.5 flex items-baseline gap-1.5 min-w-0">
          <span className="font-display text-[14px] 2xl:text-[18px] font-semibold text-pos-on-deep">{currencySymbol}</span>
          <span className="font-display text-[32px] 2xl:text-[44px] font-bold leading-none tracking-tight tabular-nums truncate" title={full}>
            {amount}
          </span>
        </div>

        {changeVsYesterday !== null && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-pos-lime px-2 py-0.5 text-[11px] font-bold text-pos-deep tabular-nums">
              <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
              {up ? '+' : ''}{changeVsYesterday.toFixed(1)}%
            </span>
            <span className="text-[12px] text-pos-on-deep">vs same time yesterday</span>
          </div>
        )}

        {truncatedNote ? (
          <p className="mt-2 text-[11px] text-pos-on-deep">{truncatedNote}</p>
        ) : null}

        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-pos-deep-border pt-3 mt-4">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <p className="text-[10px] text-pos-on-deep truncate">{s.label}</p>
              <p className="mt-0.5 font-display text-[16px] font-bold tabular-nums truncate" title={s.value}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {paymentMix.length > 0 && (
        <div className="hidden w-[160px] shrink-0 border-l border-pos-deep-border pl-[14px] lg:block">
          <p className="text-[12px] font-semibold text-white">Payment mix</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {paymentMix.map((m) => (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12px] text-pos-on-deep" title={m.label}>{m.label}</span>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums">{Math.round(m.share * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-pos-deep-tile">
                  <div
                    className="h-full rounded-full bg-pos-lime"
                    style={{ width: `${Math.max(m.share * 100, 2)}%` }}
                    title={formatMoney(m.amount)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
