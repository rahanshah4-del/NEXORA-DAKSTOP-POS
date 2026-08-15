import React from 'react';
import { Button } from '@/components/ui/Button';
import {
  AlertTriangle, RefreshCw, ShoppingCart, Users, ClipboardList,
  ChefHat, FileText, Settings, LayoutGrid, Plus, Package,
  Table, Coffee, UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const screenIcons: Record<string, LucideIcon> = {
  orders: ShoppingCart, products: Package, customers: Users,
  tables: Table, kitchen: ChefHat, staff: UserPlus,
  reports: FileText, settings: Settings, dashboard: ClipboardList,
};

export const ScreenEmptyState: React.FC<{
  screen: string; title?: string; description?: string;
  action?: string; onAction?: () => void; secondary?: string; onSecondary?: () => void;
}> = ({ screen, title, description, action, onAction, secondary, onSecondary }) => {
  const Icon = screenIcons[screen] ?? Package;
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center" role="status">
      <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center mb-6 ring-1 ring-border">
        <Icon className="w-10 h-10 text-content-tertiary" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-semibold text-content mb-2">{title ?? 'Nothing here yet'}</h3>
      <p className="text-sm text-content-secondary max-w-sm mb-6 leading-relaxed">
        {description ?? 'Get started by adding your first item.'}
      </p>
      <div className="flex gap-3">
        {action && onAction && (
          <Button onClick={onAction} leftIcon={<Plus className="w-4 h-4" />} size="md">
            {action}
          </Button>
        )}
        {secondary && onSecondary && (
          <Button variant="outline" onClick={onSecondary} size="md">{secondary}</Button>
        )}
      </div>
    </div>
  );
};

export const ScreenErrorState: React.FC<{
  error: string; onRetry?: () => void; onDismiss?: () => void;
}> = ({ error, onRetry, onDismiss }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center" role="alert">
    <div className="w-20 h-20 rounded-2xl bg-danger/5 flex items-center justify-center mb-6 ring-1 ring-danger/20">
      <AlertTriangle className="w-10 h-10 text-danger" strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-semibold text-content mb-2">Something went wrong</h3>
    <p className="text-sm text-content-secondary max-w-sm mb-6 leading-relaxed">{error}</p>
    <div className="flex gap-3">
      {onRetry && (
        <Button onClick={onRetry} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
      )}
      {onDismiss && (
        <Button variant="ghost" onClick={onDismiss}>Dismiss</Button>
      )}
    </div>
  </div>
);

export const ScreenUnauthorized: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center" role="alert">
    <div className="w-20 h-20 rounded-2xl bg-warning/5 flex items-center justify-center mb-6 ring-1 ring-warning/20">
      <AlertTriangle className="w-10 h-10 text-warning" strokeWidth={1.5} />
    </div>
    <h3 className="text-xl font-semibold text-content mb-2">Access Denied</h3>
    <p className="text-sm text-content-secondary max-w-sm leading-relaxed">
      {message ?? 'You do not have permission to access this screen.'}
    </p>
  </div>
);
