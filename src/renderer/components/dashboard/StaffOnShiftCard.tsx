import { cn } from '@/utils/cn';
import type { StaffStat } from '@/hooks/useDashboardMetrics';
import { Card, CardHead, EmptyNote, initials } from './primitives';
import { useDashboardFormat } from './format';

export interface StaffOnShiftCardProps {
  stats: StaffStat[];
  /** Signed-in staff name; the only person whose role the order data implies. */
  currentStaffName?: string;
  /** Already run through formatRole. */
  currentStaffRole?: string;
  /** False switches the copy from shift language to period language. */
  isToday?: boolean;
  className?: string;
}

export function StaffOnShiftCard({ stats, currentStaffName, currentStaffRole, isToday = true, className }: StaffOnShiftCardProps) {
  const { formatMoney, formatNumber } = useDashboardFormat();

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHead
        title={isToday ? 'Staff on shift' : 'Staff'}
        action={stats.length > 0
          ? <span className="text-[12px] text-pos-muted">{isToday ? 'Sales today' : 'Sales in period'}</span>
          : undefined}
      />
      <div className="px-[14px] pb-[14px] 2xl:px-[18px] 2xl:pb-[18px]">
        {stats.length === 0 ? (
          <EmptyNote>No staff activity today</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {stats.map((s, i) => {
              const isTop = i === 0;
              const isCurrent = !!currentStaffName && s.name === currentStaffName;
              // Orders carry staffName but no role, so a role only shows for
              // the signed-in user, whose role comes from the auth profile.
              const meta = [
                isCurrent && currentStaffRole ? currentStaffRole : null,
                `${formatNumber(s.orders)} orders`,
              ].filter(Boolean).join(' · ');

              return (
                <li
                  key={`${s.name}-${i}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-tile px-2.5 py-2',
                    isTop ? 'bg-pos-primary-soft' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      isTop ? 'bg-pos-deep text-pos-lime' : 'bg-pos-ground text-pos-muted',
                    )}
                    aria-hidden="true"
                  >
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-pos-ink" title={s.name}>{s.name}</p>
                    <p className="truncate text-[12px] text-pos-muted">{meta}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-pos-ink">
                    {formatMoney(s.sales)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
