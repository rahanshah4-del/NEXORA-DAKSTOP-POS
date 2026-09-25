import { WindowControls } from '@/components/layout/WindowControls';
import { cn } from '@/utils/cn';
import { initials } from './primitives';
import { useDashboardFormat } from './format';

export interface TopBarProps {
  /** Business name from settings; omitted when it is unset or still the default. */
  businessName?: string;
  isOnline: boolean;
  pendingSync: number | null;
  stuckSync: number;
  staffName: string;
  staffRole: string;
  /** Formatted shift start, e.g. "9:00 am". Omitted when no open cash session. */
  shiftSince?: string;
}

export function TopBar({
  businessName, isOnline, pendingSync, stuckSync, staffName, staffRole, shiftSince,
}: TopBarProps) {
  const { formatNumber } = useDashboardFormat();

  const sync = !isOnline
    ? { text: 'Offline', dot: 'bg-pos-cancel-fg', fg: 'text-pos-cancel-fg', bg: 'bg-pos-cancel-bg' }
    : stuckSync > 0
      ? { text: `${formatNumber(stuckSync)} stuck`, dot: 'bg-pos-cancel-fg', fg: 'text-pos-cancel-fg', bg: 'bg-pos-cancel-bg' }
      : pendingSync === null
        ? { text: 'Sync unknown', dot: 'bg-pos-muted', fg: 'text-pos-muted', bg: 'bg-pos-divider' }
        : pendingSync > 0
          ? { text: `${formatNumber(pendingSync)} pending`, dot: 'bg-pos-pending-fg', fg: 'text-pos-pending-fg', bg: 'bg-pos-pending-bg' }
          : { text: 'Online · All synced', dot: 'bg-pos-primary', fg: 'text-pos-primary-dark', bg: 'bg-pos-primary-soft' };

  const roleLine = [staffRole, shiftSince ? `Shift since ${shiftSince}` : null].filter(Boolean).join(' · ');

  return (
    <header className="flex h-[50px] shrink-0 items-center gap-2.5 border-b border-pos-card-border bg-pos-bar px-[16px]">
      <span className="font-display text-[16px] font-bold tracking-tight text-pos-ink">Nexora</span>
      {businessName ? (
        <span className="min-w-0 truncate text-[12px] text-pos-muted" title={businessName}>{businessName}</span>
      ) : null}

      <div className="drag-region h-full flex-1" />

      <div className="no-drag flex items-center gap-3">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1', sync.bg)}>
          <span className={cn('h-2 w-2 rounded-full', sync.dot)} aria-hidden="true" />
          <span className={cn('whitespace-nowrap text-[11px] font-medium', sync.fg)}>{sync.text}</span>
        </span>

        <div className="flex items-center gap-2.5">
          <span
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-pos-deep font-display text-[12px] font-bold text-pos-lime"
            aria-hidden="true"
          >
            {initials(staffName)}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[13px] font-semibold text-pos-ink" title={staffName}>{staffName}</span>
            {roleLine ? <span className="truncate text-[11px] text-pos-muted">{roleLine}</span> : null}
          </span>
        </div>

        <WindowControls className="[&>button]:h-7 [&>button]:w-9 [&>button]:rounded-btn" />
      </div>
    </header>
  );
}
