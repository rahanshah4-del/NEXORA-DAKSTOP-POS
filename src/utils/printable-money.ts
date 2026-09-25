/**
 * printable-money — ASCII-only money formatting for thermal receipts.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE RENDERER COPY
 * The ESC/POS builder writes text with Buffer.from(s, 'ascii'), which masks the
 * high bit instead of erroring, so a single non-ASCII character silently prints
 * as an unrelated glyph ("Rs 1,250" is fine, "₹1,250" prints as "91,250").
 * Everything that reaches a printer therefore goes through here first.
 *
 * This module is byte-for-byte equivalent to `formatMoneyPrintable` in
 * src/renderer/utils/workspaceMoney.ts. It is duplicated rather than shared
 * because the two TypeScript projects are `composite` and their `include` lists
 * do not overlap on any runtime directory: tsconfig.node.json covers src/utils
 * but not src/renderer, and tsconfig.web.json covers src/renderer but not
 * src/utils. Importing across that line raises TS6307. The self-check asserts
 * both copies agree on a large input matrix, so drift fails loudly.
 */

/** Space through tilde — everything a thermal printer renders reliably. */
const ASCII_PRINTABLE_RE = /^[\x20-\x7E]*$/;
const ISO_CODE_RE = /^[A-Za-z]{3}$/;

/** Strings may arrive already grouped ("12,500"); anything unusable becomes 0. */
function toAmount(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw === 'string') {
    const n = Number(raw.replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Fall back to PKR when the payload carries no usable code. */
function safeCode(code: unknown): string {
  if (typeof code !== 'string') return 'PKR';
  const trimmed = code.trim();
  return ISO_CODE_RE.test(trimmed) ? trimmed.toUpperCase() : 'PKR';
}

/**
 * Format money for a receipt. Output is guaranteed to match /^[\x20-\x7E]*$/.
 *
 * The owner's symbol override is used only when it is entirely ASCII;
 * otherwise the ISO code stands in, so "₨" degrades to "PKR" rather than
 * printing garbage. Always `SYMBOL SPACE DIGITS`, with the minus sign ahead of
 * the symbol ("-Rs 50"), digits grouped en-IN for INR and en-US otherwise,
 * and no fractional part.
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
  // Intl uses U+00A0/U+202F as a group separator in some locales.
  digits = digits.replace(/[  ]/g, ' ');

  // Belt and braces: nothing outside printable ASCII may reach the builder.
  return `${sign}${symbol} ${digits}`.replace(/[^\x20-\x7E]/g, '');
}

/** The bare symbol a receipt should print for this code/override pair. */
export function printableSymbol(code: unknown, symbolOverride?: string | null): string {
  const isoCode = safeCode(code);
  const raw = typeof symbolOverride === 'string' ? symbolOverride.trim() : '';
  return raw && ASCII_PRINTABLE_RE.test(raw) ? raw : isoCode;
}
