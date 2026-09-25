import { cn } from '@/utils/cn';
import type { ProductStat } from '@/hooks/useDashboardMetrics';
import { Card, CardHead, EmptyNote } from './primitives';
import { useDashboardFormat } from './format';

export interface TopSellersCardProps {
  products: ProductStat[];
  className?: string;
}

export function TopSellersCard({ products, className }: TopSellersCardProps) {
  const { formatMoney, formatNumber } = useDashboardFormat();
  const leader = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHead
        title="Top sellers"
        action={products.length > 0 ? <span className="text-[12px] text-pos-muted">By revenue</span> : undefined}
      />
      <div className="px-[14px] pb-[14px] 2xl:px-[18px] 2xl:pb-[18px]">
        {products.length === 0 ? (
          <EmptyNote>No products sold today</EmptyNote>
        ) : (
          <ol className="flex flex-col gap-3">
            {products.map((p, i) => (
              <li key={`${p.name}-${i}`} className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[12px] font-bold tabular-nums',
                    i === 0 ? 'bg-pos-deep text-pos-lime' : 'bg-pos-ground text-pos-muted',
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-semibold text-pos-ink" title={p.name}>{p.name}</span>
                    <span className="shrink-0 text-[12px] font-bold tabular-nums text-pos-ink">
                      {formatMoney(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-pos-divider">
                    <div
                      className="h-full rounded-full bg-pos-primary"
                      style={{ width: `${Math.max((p.revenue / leader) * 100, 2)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] tabular-nums text-pos-muted">
                    {formatNumber(p.qty)} sold
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
