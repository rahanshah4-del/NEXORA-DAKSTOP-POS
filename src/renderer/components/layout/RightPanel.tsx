import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { X, CheckCheck, Trash2 } from 'lucide-react';
import { formatTime } from '@/utils/formatters';

export function RightPanel() {
  const rightPanel = useUIStore((s) => s.rightPanel);
  const notifications = useUIStore((s) => s.notifications);
  const unreadCount = useUIStore((s) => s.unreadCount);
  const closeRightPanel = useUIStore((s) => s.closeRightPanel);
  const markNotificationRead = useUIStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useUIStore((s) => s.markAllNotificationsRead);
  const clearNotifications = useUIStore((s) => s.clearNotifications);

  return (
    <>
      {/* Overlay */}
      {rightPanel.open && (
        <div
          className="fixed inset-0 z-[var(--z-overlay)] bg-black/20 transition-opacity"
          onClick={closeRightPanel}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 bottom-0 z-[var(--z-right-panel)]',
          'w-[var(--right-panel-width)] bg-surface border-l border-border shadow-panel',
          'flex flex-col transition-transform duration-200 ease-in-out',
          rightPanel.open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-header border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-content">
              {rightPanel.title || 'Notifications'}
            </h2>
            {unreadCount > 0 && rightPanel.type === 'notifications' && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-content rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={closeRightPanel}
            className="p-1.5 rounded-lg text-content-tertiary hover:text-content hover:bg-surface-tertiary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {rightPanel.type === 'notifications' ? (
            <div className="p-4">
              {/* Actions */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<CheckCheck className="h-3.5 w-3.5" />}
                  onClick={markAllNotificationsRead}
                  disabled={unreadCount === 0}
                >
                  Mark All Read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={clearNotifications}
                  disabled={notifications.length === 0}
                >
                  Clear All
                </Button>
              </div>

              <Separator className="mb-3" />

              {/* Notification List */}
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-content-secondary">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg transition-colors duration-100',
                        notif.read
                          ? 'bg-transparent hover:bg-surface-tertiary'
                          : 'bg-primary/5 hover:bg-primary/10',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full mt-1.5 flex-shrink-0',
                            notif.type === 'success' && 'bg-success',
                            notif.type === 'warning' && 'bg-warning',
                            notif.type === 'error' && 'bg-danger',
                            notif.type === 'info' && 'bg-info',
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm',
                              notif.read ? 'text-content-secondary' : 'text-content font-medium',
                            )}
                          >
                            {notif.message}
                          </p>
                          <p className="text-xs text-content-tertiary mt-0.5">
                            {formatTime(notif.timestamp)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-content-secondary">Select an item to view details</p>
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}
