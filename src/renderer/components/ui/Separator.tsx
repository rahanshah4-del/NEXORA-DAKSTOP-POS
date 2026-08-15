import { cn } from '@/utils/cn';

interface SeparatorProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
}

export function Separator({ className, orientation = 'horizontal', label }: SeparatorProps) {
  if (label) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-content-tertiary font-medium">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
        'bg-border',
        className,
      )}
    />
  );
}
