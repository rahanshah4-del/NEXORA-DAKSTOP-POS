import { useState, useCallback, type ChangeEvent } from 'react';
import { cn } from '@/utils/cn';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  className,
  debounceMs = 300,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value || '');
  const [debounceTimeout, setDebounceTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = value !== undefined ? value : localValue;

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange?.(newValue);

      if (debounceTimeout) clearTimeout(debounceTimeout);
      const timeout = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
      setDebounceTimeout(timeout);
    },
    [onChange, onSearch, debounceTimeout, debounceMs],
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange?.('');
    onSearch?.('');
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        onSearch?.(displayValue);
      }
    },
    [debounceTimeout, onSearch, displayValue],
  );

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-tertiary pointer-events-none" />
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 pl-9 pr-8 text-sm bg-surface border border-border rounded-lg',
          'text-content placeholder:text-content-tertiary',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
          'hover:border-border-strong',
        )}
      />
      {displayValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-content-tertiary hover:text-content transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
