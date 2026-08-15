import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/ui-store';
import { WindowControls } from './WindowControls';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  Bell,
  BellRing,
  Search,
  Moon,
  Sun,
  RotateCw,
  Wifi,
  WifiOff,
  Clock,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useState, useEffect } from 'react';
import { formatTime } from '@/utils/formatters';

interface HeaderProps {
  title?: string;
  className?: string;
}

export function Header({ title, className }: HeaderProps) {
  const { isDark, toggle } = useTheme();
  const unreadCount = useUIStore((s) => s.unreadCount);
  const rightPanelOpen = useUIStore((s) => s.rightPanel.open);
  const setGlobalSearchOpen = useUIStore((s) => s.setGlobalSearchOpen);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [stuckCount, setStuckCount] = useState(0);
  const [hasStuck, setHasStuck] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending sync count
    const pollSync = async () => {
      try {
        const count = window.api?.local?.sync?.pendingCount;
        if (typeof count === 'function') {
          const r = await count();
          setPendingSync((r as any)?.count ?? 0);
          setStuckCount((r as any)?.stuck ?? 0);
          setHasStuck(((r as any)?.stuck ?? 0) > 0);
        }
      } catch { /* non-critical */ }
    };
    pollSync();
    const syncTimer = setInterval(pollSync, 15_000);

    // Listen for live sync drain results from the main process
    let unsub: (() => void) | undefined;
    if (window.api?.local?.sync?.onResult) {
      unsub = window.api.local.sync.onResult((result) => {
        if (result.stuck > 0) setHasStuck(true);
        // Refresh pending count immediately (authoritative stuck comes from the DB)
        pollSync();
      });
    }

    return () => {
      clearInterval(timer);
      clearInterval(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsub) unsub();
    };
  }, []);

  return (
    <header
      className={cn(
        'flex items-center h-header px-4 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0 z-[var(--z-header)]',
        className,
      )}
    >
      {/* Left: Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <h1 className="text-sm font-semibold text-content truncate">{title}</h1>
        )}
      </div>

      {/* Center: Spacer */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Pending Sync */}
        {(pendingSync > 0 || stuckCount > 0) && (
          <Tooltip content={stuckCount > 0 ? `${pendingSync} pending · ${stuckCount} stuck — needs attention` : `${pendingSync} order${pendingSync !== 1 ? 's' : ''} pending cloud sync`} side="bottom">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full border',
              hasStuck
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-amber-700 bg-amber-50 border-amber-200',
            )}>
              <RotateCw className={cn('h-3 w-3', hasStuck && 'text-red-500')} />
              {stuckCount > 0 ? `${pendingSync}/${stuckCount}` : pendingSync}
            </div>
          </Tooltip>
        )}

        {/* Connection Status */}
        <Tooltip content={isOnline ? 'Connected' : 'Offline'} side="bottom">
          <div className="h-8 w-8 flex items-center justify-center">
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-danger" />
            )}
          </div>
        </Tooltip>

        {/* Time */}
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-content-secondary">
          <Clock className="h-3 w-3" />
          <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
        </div>

        {/* Search */}
        <Tooltip content="Search (Ctrl+K)" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setGlobalSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Sync */}
        <Tooltip content="Sync Now" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sync"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip content={isDark ? 'Light Mode' : 'Dark Mode'} side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        {/* Notifications */}
        <Tooltip content="Notifications" side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => useUIStore.getState().openRightPanel('notifications', 'Notifications')}
            aria-label="Notifications"
            className="relative"
          >
            {unreadCount > 0 ? (
              <>
                <BellRing className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full ring-2 ring-surface" />
              </>
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>

        {/* Spacer */}
        <div className="w-2" />

        {/* Window Controls */}
        <WindowControls />
      </div>
    </header>
  );
}
