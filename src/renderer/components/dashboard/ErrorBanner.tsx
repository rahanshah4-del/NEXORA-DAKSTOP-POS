import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { focusRing } from './primitives';

export interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

/** Shown when a refresh failed but cached orders are still on screen. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-center gap-3 rounded-card bg-pos-cancel-bg px-5 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-pos-cancel-fg" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[13px] text-pos-cancel-fg">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'shrink-0 rounded-btn px-3 py-1.5 text-[13px] font-semibold text-pos-cancel-fg underline underline-offset-2',
          focusRing,
        )}
      >
        Retry
      </button>
    </div>
  );
}
