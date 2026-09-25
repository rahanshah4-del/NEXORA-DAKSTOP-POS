/**
 * workspaceMoney — currency formatting that matches the Nexora web dashboard.
 *
 * The workspace document (workspaces/{workspaceId}) carries an ISO-4217 code
 * and an optional owner symbol override. These helpers turn that pair into the
 * same strings the web app renders, so a bill on the desktop reads identically
 * to the same bill in the browser.
 *
 * Deliberately separate from `@/utils/formatters`, which is the older
 * settings-store-driven formatter still used by Billing, Reports and the
 * printer templates. Those are converted in a later task.
 *
 * ── Self-check (no test runner is configured in this repo) ──
 * Verified by transpiling this module and asserting:
 *
 *   formatWorkspaceMoney(12500, 'PKR')          === 'PKR 12,500'
 *   formatWorkspaceMoney(12500, 'PKR', 'Rs')    === 'Rs 12,500'
 *   formatWorkspaceMoney(12500, 'PKR', 'Rs.')   === 'Rs. 12,500'
 *   formatWorkspaceMoney(12500, 'INR')          === '₹12,500'
 *   formatWorkspaceMoney(12500, 'USD')          === '$12,500'
 *   formatWorkspaceMoney(12500, 'AED', 'AED')   === 'AED 12,500'
 *   formatWorkspaceMoney(-50,   'PKR', 'Rs')    === '-Rs 50'
 *
 *   formatMoneyPrintable(12500,   'PKR', 'Rs')  === 'Rs 12,500'
 *   formatMoneyPrintable(12500,   'PKR', '\u20A8') === 'PKR 12,500'   // non-ASCII override rejected
 *   formatMoneyPrintable(1234567, 'INR')        === 'INR 12,34,567'
 *   formatMoneyPrintable(12500,   'USD')        === 'USD 12,500'
 *   formatMoneyPrintable(-50,     'PKR', 'Rs')  === '-Rs 50'
 *
 * Every formatMoneyPrintable output must satisfy /^[\x20-\x7E]*$/.
 */

import { getWorkspaceCurrencySnapshot } from '@/hooks/useWorkspaceCurrency';

export interface WorkspaceMoneyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/** Symbols ending in a letter, digit or period need a space before the number. */
const NEEDS_SPACE_RE = /[\p{L}\p{N}.]$/u;

/**
 * Intl emits U+00A0 (and U+202F in some locales) between symbol and number.
 * Those survive copy/paste and string comparison badly, so the output is
 * always normalized to a plain space.
 */
function normalizeSpaces(s: string): string {
  return s.replace(/[  ]/g, ' ');
}

/** The web pairs INR with en-IN (lakh grouping) and everything else with en-US. */
function localeFor(code: string): string {
  return code === 'INR' ? 'en-IN' : 'en-US';
}

/** Strings may arrive already grouped ("12,500"); anything unusable becomes 0. */
function toAmount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Resolve fraction digits, clamped to a range Intl will accept, min <= max. */
function resolveDigits(options?: WorkspaceMoneyOptions): { min: number; max: number } {
  const clamp = (n: number) => Math.min(20, Math.max(0, Math.trunc(n)));
  const max = clamp(Number.isFinite(options?.maximumFractionDigits as number)
    ? (options!.maximumFractionDigits as number)
    : 0);
  const rawMin = Number.isFinite(options?.minimumFractionDigits as number)
    ? (options!.minimumFractionDigits as number)
    : 0;
  return { min: Math.min(clamp(rawMin), max), max };
}

/**
 * Format an amount as workspace currency.
 *
 * With no override this is a plain Intl currency format. With an override the
 * currency part is swapped out via formatToParts, and the separator is
 * rebuilt so a word-like symbol always gets exactly one space and a glyph
 * symbol gets none — never a double space, whatever the locale supplied.
 */
export function formatWorkspaceMoney(
  amount: unknown,
  code: string,
  symbolOverride?: string | null,
  options?: WorkspaceMoneyOptions,
): string {
  const value = toAmount(amount);
  const { min, max } = resolveDigits(options);
  const override = typeof symbolOverride === 'string' ? symbolOverride.trim() : '';

  try {
    const nf = new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });

    if (!override) return normalizeSpaces(nf.format(value));

    const parts = nf.formatToParts(value);
    const currencyIdx = parts.findIndex((p) => p.type === 'currency');
    // No currency part to replace (shouldn't happen for style:'currency').
    if (currencyIdx === -1) return normalizeSpaces(nf.format(value));

    const out = parts.map((p) => p.value);
    out[currencyIdx] = override;

    const needsSpace = NEEDS_SPACE_RE.test(override);
    const numberIdx = parts.findIndex((p) => p.type === 'integer');
    const currencyIsPrefix = numberIdx === -1 || currencyIdx < numberIdx;
    const adjacentIdx = currencyIsPrefix ? currencyIdx + 1 : currencyIdx - 1;
    const adjacent = parts[adjacentIdx];

    if (adjacent && adjacent.type === 'literal' && /^\s*$/.test(adjacent.value)) {
      // Locale already put a separator there — replace it, never add to it.
      out[adjacentIdx] = needsSpace ? ' ' : '';
    } else if (needsSpace) {
      // No separator in this locale; attach exactly one to the symbol itself.
      out[currencyIdx] = currencyIsPrefix ? `${override} ` : ` ${override}`;
    }

    return normalizeSpaces(out.join(''));
  } catch {
    // Unknown/invalid currency code — Intl throws RangeError.
    const sign = value < 0 ? '-' : '';
    return `${sign}${override || code} ${Math.abs(value).toFixed(max)}`;
  }
}

/**
 * Compact form for chart labels: thousands, one decimal, "k" suffix.
 * Symbol handling is identical to formatWorkspaceMoney.
 */
export function formatWorkspaceMoneyCompact(
  amount: unknown,
  code: string,
  symbolOverride?: string | null,
): string {
  const value = toAmount(amount);
  return `${formatWorkspaceMoney(value / 1000, code, symbolOverride, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}k`;
}

/**
 * The symbol alone: the owner override when set, otherwise whatever Intl uses
 * for this code ("₹" for INR, "$" for USD, "PKR" for PKR).
 */
export function getWorkspaceSymbol(code: string, symbolOverride?: string | null): string {
  const override = typeof symbolOverride === 'string' ? symbolOverride.trim() : '';
  if (override) return override;

  try {
    const part = new Intl.NumberFormat(localeFor(code), {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return normalizeSpaces(part?.value ?? code);
  } catch {
    return code;
  }
}

// ── Printable (ASCII-only) money, for thermal receipts ──

/** Space through tilde — everything a thermal printer renders reliably. */
const ASCII_PRINTABLE_RE = /^[\x20-\x7E]*$/;
const ISO_CODE_RE = /^[A-Za-z]{3}$/;

/** Fall back to PKR when there is no usable code. */
function safeCode(code: unknown): string {
  if (typeof code !== 'string') return 'PKR';
  const trimmed = code.trim();
  return ISO_CODE_RE.test(trimmed) ? trimmed.toUpperCase() : 'PKR';
}

/**
 * Format money for a receipt. Output is guaranteed to match /^[\x20-\x7E]*$/.
 *
 * The ESC/POS builder writes with Buffer.from(s, 'ascii'), which silently
 * corrupts non-ASCII, so the owner's symbol override is used only when it is
 * entirely ASCII; otherwise the ISO code stands in ("\u20A8" degrades to "PKR").
 * Always `SYMBOL SPACE DIGITS`, minus sign ahead of the symbol ("-Rs 50"),
 * digits grouped en-IN for INR and en-US otherwise, no fractional part.
 *
 * Mirrored byte-for-byte by src/utils/printable-money.ts, which is what the
 * main-process printer templates import. The two projects are `composite` with
 * non-overlapping `include` lists, so neither can import the other without
 * TS6307; the self-check cross-asserts them instead.
 */
export function formatMoneyPrintable(
  amount: unknown,
  code: unknown,
  symbolOverride?: string | null,
): string {
  const value = toAmount(amount);
  const isoCode = safeCode(code);
  const raw = typeof symbolOverride === 'string' ? symbolOverride.trim() : '';
  const symbol = raw && ASCII_PRINTABLE_RE.test(raw) ? raw : isoCode;

  const sign = value < 0 ? '-' : '';
  const locale = isoCode === 'INR' ? 'en-IN' : 'en-US';

  let digits: string;
  try {
    digits = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
  } catch {
    digits = Math.abs(value).toFixed(0);
  }
  digits = normalizeSpaces(digits);

  return `${sign}${symbol} ${digits}`.replace(/[^\x20-\x7E]/g, '');
}

/**
 * The resolved workspace currency, outside React.
 *
 * Thin re-export of the zustand snapshot in useWorkspaceCurrency so callers
 * that already import this module (formatters, event handlers, `getState()`
 * call sites) do not need a second import. Prefer `useWorkspaceCurrencyValue()`
 * inside components — this one does not re-render on change.
 */
export function getResolvedWorkspaceCurrency(): { currencyCode: string; currencySymbol: string } {
  const { currencyCode, currencySymbol } = getWorkspaceCurrencySnapshot();
  return { currencyCode, currencySymbol };
}
