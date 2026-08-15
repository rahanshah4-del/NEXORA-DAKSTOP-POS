import { useSettingsStore } from '@/stores/settings-store';

// ── Currency symbol map ──
export const currencySymbols: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', SAR: '﷼', JPY: '¥',
  CNY: '¥', PKR: 'Rs', BDT: '৳', LKR: 'රු', NPR: 'रू',
};

export function getCurrencySymbol(code: string): string {
  return currencySymbols[code] || code;
}

/**
 * Centralized currency formatting helper.
 * Reads the selected currency from the settings store statically (safe outside React)
 * or via the `useCurrencySymbol()` hook for reactive updates.
 *
 * @param amount - Amount in RUPEES (not paise/cents). The app uses rupees directly.
 * @param currencyCode - Optional override (defaults to settings store value)
 */
export function formatCurrencyAmount(amount: number, currencyCode?: string): string {
  // Use the settings store directly for non-reactive contexts
  const code = currencyCode || useSettingsStore.getState().currency || 'INR';
  const symbol = getCurrencySymbol(code);
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Compact currency formatting for large numbers (e.g. ₹1.5L).
 * @param amount - Amount in RUPEES.
 */
export function formatCompactCurrencyAmount(amount: number, currencyCode?: string): string {
  const code = currencyCode || useSettingsStore.getState().currency || 'INR';
  const symbol = getCurrencySymbol(code);
  if (amount >= 1_00_000) {
    return `${symbol}${(amount / 1_00_000).toFixed(1)}L`;
  }
  if (amount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(0)}`;
}

// ── Deprecated: old API kept for compatibility ──

/** @deprecated Use formatCurrencyAmount with rupees instead. */
export function formatCurrency(cents: number, locale = 'en-IN'): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** @deprecated Use formatCompactCurrencyAmount with rupees instead. */
export function formatCompactCurrency(cents: number): string {
  const amount = cents / 100;
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(1)}L`;
  }
  if (amount >= 1_000) {
    return `₹${(amount / 1_000).toFixed(1)}K`;
  }
  return `₹${amount.toFixed(0)}`;
}

export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'relative' = 'short',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date, 'short');
  }

  const opts: Intl.DateTimeFormatOptions =
    format === 'long'
      ? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };

  return new Intl.DateTimeFormat('en-IN', opts).format(d);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}
