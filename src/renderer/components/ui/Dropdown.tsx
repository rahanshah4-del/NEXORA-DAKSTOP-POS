import { useState, useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  triggerClassName?: string;
}

interface DropdownMenuProps {
  items: DropdownItem[];
  align?: 'left' | 'right';
  onClose: () => void;
}

function DropdownMenu({ items, align = 'left', onClose }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute top-full mt-1 z-[var(--z-dropdown)]',
        'min-w-[180px] py-1 bg-surface-elevated border border-border rounded-lg shadow-dropdown',
        'animate-fade-in',
        align === 'right' ? 'right-0' : 'left-0',
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          disabled={item.disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-75',
            item.danger
              ? 'text-danger hover:bg-danger/10'
              : 'text-content hover:bg-surface-tertiary',
            item.disabled && 'opacity-40 cursor-not-allowed',
          )}
        >
          {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
          <span className="flex-1 text-left">{item.label}</span>
          {item.shortcut && (
            <span className="text-xs text-content-tertiary flex-shrink-0">{item.shortcut}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Dropdown({ trigger, items, align = 'left', className, triggerClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div
        onClick={() => setOpen(!open)}
        className={cn('cursor-pointer', triggerClassName)}
      >
        {trigger}
      </div>
      {open && <DropdownMenu items={items} align={align} onClose={() => setOpen(false)} />}
    </div>
  );
}

interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
  variant?: 'primary' | 'secondary';
}

export function DropdownButton({
  label,
  items,
  align = 'right',
  className,
  variant = 'secondary',
}: DropdownButtonProps) {
  return (
    <Dropdown
      items={items}
      align={align}
      className={className}
      trigger={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium rounded-lg cursor-pointer transition-colors',
            variant === 'primary'
              ? 'bg-primary text-primary-content hover:bg-primary-hover'
              : 'bg-surface-tertiary text-content hover:bg-border border border-border',
          )}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </span>
      }
    />
  );
}
