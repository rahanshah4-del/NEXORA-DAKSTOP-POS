import { AppleSpinner, BrandLoader } from './Loading';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Backwards-compatible wrapper — now renders the Apple-style ring instead of a
 * generic lucide spinner icon. Existing <Spinner> / <PageSpinner> usages get
 * the new look automatically.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return <AppleSpinner size={size} className={className} />;
}

/** Full-screen loading moment (route lazy-load / screen transition). */
export function PageSpinner() {
  return <BrandLoader className="h-64" />;
}
