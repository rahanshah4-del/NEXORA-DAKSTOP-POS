import { cn } from '@/utils/cn';
import { Card, focusRing } from './primitives';
import { useDashboardFormat } from './format';

export interface TableSquare {
  id: string;
  name: string;
  occupied: boolean;
}

export interface TablesCardProps {
  tables: TableSquare[];
  occupied: number;
  onFloorView: () => void;
  className?: string;
}

export function TablesCard({ tables, occupied, onFloorView, className }: TablesCardProps) {
  const { formatNumber } = useDashboardFormat();
  const total = tables.length;
  const hasTables = total > 0;

  return (
    <Card className={cn('flex flex-col p-[14px] 2xl:p-[18px]', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-pos-muted">Tables</p>
        <button
          type="button"
          onClick={onFloorView}
          className={cn('rounded text-[12px] font-semibold text-pos-primary hover:text-pos-primary-dark', focusRing)}
        >
          Floor view
        </button>
      </div>

      {hasTables ? (
        <>
          <p className="mt-2 flex items-baseline gap-1 font-display text-[26px] font-bold leading-none tabular-nums text-pos-ink">
            {formatNumber(occupied)}
            <span className="text-[15px] font-semibold text-pos-muted">/ {formatNumber(total)}</span>
          </p>
          <p className="mt-1.5 text-[12px] text-pos-muted">
            occupied · {formatNumber(total - occupied)} free
          </p>

          <div className="mt-auto grid grid-cols-8 gap-1.5 pt-4">
            {tables.map((t) => (
              <span
                key={t.id}
                title={`${t.name} — ${t.occupied ? 'occupied' : 'free'}`}
                className={cn(
                  'aspect-square rounded-[6px]',
                  t.occupied ? 'bg-pos-primary' : 'bg-pos-ground border border-pos-card-border',
                )}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-[26px] font-bold leading-none text-pos-ink">—</p>
          <p className="mt-1.5 text-[12px] text-pos-muted">Load menu in Settings to see tables</p>
        </>
      )}
    </Card>
  );
}
