import { useMemo } from 'react';
import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import {
  formatWorkspaceMoney,
  formatWorkspaceMoneyCompact,
  getWorkspaceSymbol,
} from '@/utils/workspaceMoney';

/**
 * Dashboard-local formatting helpers.
 *
 * Deliberately NOT wired to `@/utils/formatters` yet — the app-wide formatter
 * is a separate task. Every figure rendered on the dashboard (money, counts,
 * dates and times) goes through this one module so the screen never mixes
 * locales again.
 */

/**
 * Locale for non-money dashboard figures (counts, dates, times).
 * Money is formatted by `@/utils/workspaceMoney`, which picks its own locale
 * from the workspace currency code to stay identical to the web dashboard.
 */
export const DASHBOARD_LOCALE = 'en-PK';

export interface DashboardFormatters {
  /** Reactive symbol for the currently selected currency, e.g. "Rs". */
  currencySymbol: string;
  /** Full amount, e.g. "Rs 12,500". Amounts are in major units, not cents. */
  formatMoney: (amount: number) => string;
  /** Compact amount for chart labels, e.g. "Rs 12.5k". */
  formatMoneyCompact: (amount: number) => string;
  /** Grouped integer, e.g. "1,240". */
  formatNumber: (n: number) => string;
  /** Short weekday + day + month, e.g. "Thu, 25 Sep". */
  formatDate: (date: Date) => string;
  /** 12-hour clock, e.g. "04:35 pm". */
  formatTime: (date: Date) => string;
}

/**
 * The one formatter set for the whole dashboard. Reads the currency symbol
 * reactively, so switching currency in settings updates every figure at once.
 */
export function useDashboardFormat(): DashboardFormatters {
  const { currencyCode, currencySymbol: override } = useWorkspaceCurrencyValue();

  return useMemo<DashboardFormatters>(() => ({
    currencySymbol: getWorkspaceSymbol(currencyCode, override),
    // Money matches the web dashboard: Intl currency formatting against the
    // workspace code, with the owner's symbol override applied.
    formatMoney: (amount: number) => formatWorkspaceMoney(amount, currencyCode, override),
    // Same rounding as the chart label this replaced: always divided by 1000,
    // one decimal place.
    formatMoneyCompact: (amount: number) => formatWorkspaceMoneyCompact(amount, currencyCode, override),
    formatNumber: (n: number) => n.toLocaleString(DASHBOARD_LOCALE),
    formatDate: (date: Date) =>
      date.toLocaleDateString(DASHBOARD_LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }),
    formatTime: (date: Date) =>
      date.toLocaleTimeString(DASHBOARD_LOCALE, { hour: '2-digit', minute: '2-digit', hour12: true }),
  }), [currencyCode, override]);
}

/** "cashier" → "Cashier", "head_chef" → "Head Chef". */
export function formatRole(role: string | null | undefined): string {
  if (!role || !role.trim()) return '';
  return role
    .trim()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
