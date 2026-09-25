import { useDashboardFormat } from './format';

export interface DashboardFooterBarProps {
  pendingSync: number | null;
  /** Formatted clock string for "Updated". */
  updatedAt: string;
  appVersion: string | null;
}

export function DashboardFooterBar({ pendingSync, updatedAt, appVersion }: DashboardFooterBarProps) {
  const { formatNumber } = useDashboardFormat();

  return (
    <footer className="flex h-[30px] shrink-0 items-center justify-between gap-4 border-t border-pos-card-border bg-pos-bar px-[16px]">
      <div className="flex min-w-0 items-center gap-4 text-[11px] text-pos-muted">
        {pendingSync !== null && (
          <span className="whitespace-nowrap tabular-nums">{formatNumber(pendingSync)} pending sync</span>
        )}
        <span className="whitespace-nowrap">Updated {updatedAt}</span>
      </div>
      {appVersion ? (
        <span className="shrink-0 text-[11px] text-pos-muted">Nexora POS v{appVersion}</span>
      ) : null}
    </footer>
  );
}
