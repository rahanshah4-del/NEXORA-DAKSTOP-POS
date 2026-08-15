import { cn } from '@/utils/cn';
import { useState, useCallback } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  variant?: 'underline' | 'pills';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'underline',
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id ?? '');
  const active = activeTab ?? internalActive;

  const handleClick = useCallback(
    (tabId: string) => {
      setInternalActive(tabId);
      onChange?.(tabId);
    },
    [onChange],
  );

  if (variant === 'pills') {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-surface-tertiary rounded-lg', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              active === tab.id
                ? 'bg-surface-elevated text-content shadow-sm'
                : 'text-content-secondary hover:text-content',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-xs text-content-tertiary">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-0 border-b border-border', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-medium transition-colors duration-150',
            active === tab.id
              ? 'text-content'
              : 'text-content-secondary hover:text-content',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full',
                active === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'bg-surface-tertiary text-content-tertiary',
              )}
            >
              {tab.count}
            </span>
          )}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
