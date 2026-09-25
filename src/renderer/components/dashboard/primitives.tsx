import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** White card: 1px border, 20px radius. The base surface for every panel. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('bg-pos-card border border-pos-card-border rounded-card', className)}>
      {children}
    </section>
  );
}

export function CardHead({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-[14px] pt-[14px] pb-2 2xl:px-[18px] 2xl:pt-[18px]', className)}>
      <h3 className="text-[14px] font-semibold text-pos-ink truncate">{title}</h3>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="py-7 text-center text-[12px] text-pos-muted">{children}</p>
  );
}

/** Focus ring shared by every interactive element on the dashboard. */
export const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-pos-primary focus-visible:ring-offset-2 focus-visible:ring-offset-pos-ground';

// ── Order status → pill ──

export type PillTone = 'paid' | 'preparing' | 'pending' | 'cancelled' | 'neutral';

const TONES: Record<PillTone, string> = {
  paid: 'bg-pos-paid-bg text-pos-paid-fg',
  preparing: 'bg-pos-prep-bg text-pos-prep-fg',
  pending: 'bg-pos-pending-bg text-pos-pending-fg',
  cancelled: 'bg-pos-cancel-bg text-pos-cancel-fg',
  neutral: 'bg-pos-divider text-pos-muted',
};

/**
 * Maps the real stored values (orderStatus: pending/preparing/ready/served/
 * cancelled, paymentStatus: due/partial/paid/cancelled) onto a pill. Anything
 * unrecognised falls through to a neutral pill rather than being invented.
 */
export function orderPill(orderStatus?: string, paymentStatus?: string): { label: string; tone: PillTone } {
  const os = (orderStatus ?? '').trim().toLowerCase();
  const ps = (paymentStatus ?? '').trim().toLowerCase();

  // Cancelled wins outright — nothing is owed on a cancelled order.
  if (os === 'cancelled' || ps === 'cancelled') return { label: 'Cancelled', tone: 'cancelled' };

  // Money owed outranks kitchen progress. Previously a 'served' + 'due' order
  // showed a neutral "Served" pill, hiding the fact that it was unpaid.
  if (ps === 'due') return { label: 'Due', tone: 'pending' };
  if (ps === 'partial') return { label: 'Partly paid', tone: 'pending' };

  if (ps === 'paid') return { label: 'Paid', tone: 'paid' };

  // Nothing owed and nothing paid recorded — fall back to kitchen progress.
  if (os === 'preparing') return { label: 'Preparing', tone: 'preparing' };
  if (os === 'pending') return { label: 'Pending', tone: 'pending' };
  if (os === 'ready') return { label: 'Ready', tone: 'neutral' };
  if (os === 'served') return { label: 'Served', tone: 'neutral' };
  return { label: os || ps || 'Unknown', tone: 'neutral' };
}

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', TONES[tone])}>
      {label}
    </span>
  );
}

// ── Misc formatting helpers (presentation only) ──

/** "2 min ago" / "Just now" / "3 h ago". */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

/** "Rahan Shah" → "RS"; single names give one letter. */
export function initials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Short tile label for an order row: table name, TA, DL, or #. */
export function orderTile(orderType?: string, tableName?: string): string {
  if (tableName && tableName.trim()) return tableName.trim();
  const t = (orderType ?? '').trim().toLowerCase();
  if (t.startsWith('take')) return 'TA';
  if (t.startsWith('deliv')) return 'DL';
  if (t.startsWith('quick')) return 'QB';
  return '#';
}
