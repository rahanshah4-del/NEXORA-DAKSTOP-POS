/**
 * Loading.tsx — Apple-style reusable loading indicators.
 *
 * Design language follows iOS/macOS system indicators: thin gradient rings,
 * calm pulsing dots, and soft breathing/scale motion — no generic
 * spinning-circle icons.
 *
 * All motion is CSS-only (no animation dependency) and respects the app's
 * `prefers-reduced-motion` handling in global.css.
 */

import { cn } from '@/utils/cn';

// ── Primary spinner — smooth rotating gradient ring ──

interface AppleSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * iOS-style activity ring: a faint full ring + a brighter rounded arc that
 * rotates continuously. Clean and minimal, uses currentColor so it inherits
 * the surrounding text color.
 */
export function AppleSpinner({ size = 'md', className }: AppleSpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin-ring text-content-tertiary', spinnerSizes[size], className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="42 60"
      />
    </svg>
  );
}

// ── Pulsing dot cluster — Apple "thinking" indicator ──

interface DotLoaderProps {
  className?: string;
  dotClassName?: string;
}

/**
 * Three staggered pulsing dots (iMessage-typing style) for inline
 * "processing…" moments.
 */
export function DotLoader({ className, dotClassName }: DotLoaderProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('h-1.5 w-1.5 rounded-full bg-current animate-dot', dotClassName)}
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

// ── Button spinner — stable-width inline indicator ──

/**
 * Small ring for use inside buttons. Keep the button label area stable so
 * there's no layout shift when toggling between idle and loading.
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return <AppleSpinner size="sm" className={cn('text-current', className)} />;
}

// ── Full-screen branded loading state ──

interface BrandLoaderProps {
  /** Optional logo/icon node. Falls back to a neutral ring. */
  logo?: React.ReactNode;
  label?: string;
  className?: string;
}

/**
 * Calm, centered branded loading moment for full-screen / app-startup.
 * A breathing logo (subtle scale + opacity loop) plus an optional label.
 */
export function BrandLoader({ logo, label = 'Loading…', className }: BrandLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)} role="status" aria-live="polite">
      <div className="animate-breathe">
        {logo ?? <AppleSpinner size="lg" className="text-content-tertiary" />}
      </div>
      {label ? <p className="text-sm text-content-tertiary font-medium">{label}</p> : null}
      <span className="sr-only">Loading</span>
    </div>
  );
}
