import { cn } from '@/utils/cn';
import { WindowControls } from './WindowControls';
import { Button } from '@/components/ui/Button';
import { Clock, User, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface POSHeaderProps {
  restaurantName?: string;
  className?: string;
}

export function POSHeader({ restaurantName = "Nexora Solution", className }: POSHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header
      className={cn(
        'flex items-center h-header px-4 border-b border-border bg-surface shrink-0 z-[var(--z-header)]',
        className,
      )}
    >
      {/* Restaurant Name */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[15px] font-bold text-content tracking-tight whitespace-nowrap">
          {restaurantName}
        </h1>
        <span className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-medium">{timeStr}</span>
          <span className="text-content-tertiary">•</span>
          <span>{dateStr}</span>
        </div>
      </div>

      {/* Center spacer */}
      <div className="flex-1 drag-region h-full" />

      {/* Right section */}
      <div className="flex items-center gap-1 no-drag">
        {/* User */}
        <Button variant="ghost" size="sm" rightIcon={<ChevronDown className="h-3 w-3" />}>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium">Admin</span>
          </div>
        </Button>

        {/* Window Controls */}
        <WindowControls />
      </div>
    </header>
  );
}
