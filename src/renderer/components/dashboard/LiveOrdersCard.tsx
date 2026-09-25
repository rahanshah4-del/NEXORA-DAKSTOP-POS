import { cn } from '@/utils/cn';
import type { FirestoreOrder } from '@/hooks/useDashboardMetrics';
import { Card, EmptyNote, StatusPill, focusRing, orderPill, orderTile, timeAgo } from './primitives';
import { useDashboardFormat } from './format';

export interface LiveOrdersCardProps {
  orders: FirestoreOrder[];
  /** Resolves an order's stored table id to its display name, when known. */
  tableNameOf: (tableId?: string) => string | undefined;
  onViewAll: () => void;
  className?: string;
}

export function LiveOrdersCard({ orders, tableNameOf, onViewAll, className }: LiveOrdersCardProps) {
  const { formatMoney, formatNumber } = useDashboardFormat();

  return (
    <Card className={cn('flex flex-col p-[14px] 2xl:p-[18px]', className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-pos-ink">
          Live orders
          <span className="h-2 w-2 rounded-full bg-pos-primary" aria-hidden="true" />
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className={cn('rounded text-[12px] font-semibold text-pos-primary hover:text-pos-primary-dark', focusRing)}
        >
          View all
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyNote>No orders yet today</EmptyNote>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-pos-divider">
          {orders.map((o, i) => {
            const tableName = tableNameOf(o.table);
            const tile = orderTile(o.orderType, tableName);
            const pill = orderPill(o.orderStatus, o.paymentStatus);
            const items = o.cartRows?.length ?? 0;
            const meta = [
              o.orderType?.trim() || null,
              items > 0 ? `${formatNumber(items)} ${items === 1 ? 'item' : 'items'}` : null,
              timeAgo(o.createdAt) || null,
            ].filter(Boolean).join(' · ');

            return (
              <li key={`${o.orderNumber}-${i}`} className="flex items-center gap-2.5 py-2">
                <span
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-pos-ground text-[11px] font-bold text-pos-ink"
                  aria-hidden="true"
                >
                  {tile}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-pos-ink" title={o.orderNumber}>
                    {o.orderNumber}
                  </p>
                  {meta ? <p className="truncate text-[11px] text-pos-muted" title={meta}>{meta}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[12px] font-bold tabular-nums text-pos-ink">{formatMoney(o.total ?? 0)}</span>
                  <StatusPill label={pill.label} tone={pill.tone} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
