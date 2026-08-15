import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="h-14 w-14 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-content-tertiary" />
      </div>
      <h3 className="text-sm font-semibold text-content mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-content-secondary text-center max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
