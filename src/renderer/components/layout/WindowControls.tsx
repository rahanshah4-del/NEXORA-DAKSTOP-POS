import { useWindowControls } from '@/hooks/useWindowControls';
import { cn } from '@/utils/cn';
import { Minus, Square, X, Maximize2, Copy } from 'lucide-react';

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
  const { isMaximized, minimize, maximize, close, isElectron } = useWindowControls();

  if (!isElectron) return null;

  return (
    <div className={cn('flex items-center', className)}>
      <button
        onClick={minimize}
        className="h-8 w-11 inline-flex items-center justify-center text-content-tertiary hover:text-content hover:bg-surface-tertiary transition-colors no-drag"
        aria-label="Minimize"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={maximize}
        className="h-8 w-11 inline-flex items-center justify-center text-content-tertiary hover:text-content hover:bg-surface-tertiary transition-colors no-drag"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Copy className="h-3 w-3" />
        ) : (
          <Square className="h-3 w-3" />
        )}
      </button>
      <button
        onClick={close}
        className="h-8 w-11 inline-flex items-center justify-center text-content-tertiary hover:text-white hover:bg-danger transition-colors no-drag"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
