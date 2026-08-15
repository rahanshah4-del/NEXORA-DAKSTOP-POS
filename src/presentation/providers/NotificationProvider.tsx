/**
 * NotificationProvider.tsx — Bridges app-layer NotificationDispatcher to React UI.
 *
 * Subscribes to the NotificationDispatcher and maintains a React state array
 * of active notifications. Provides dismiss/clear actions.
 *
 * Usage: Wrap the app in <NotificationProvider>.
 * Components consume via useNotification() hook.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { NotificationDispatcher } from '../../application/services/NotificationDispatcher';
import type { Notification } from '../../application/services/NotificationDispatcher';
import {
  NotificationReactContext,
  type INotificationContextValue,
  type UINotification,
} from '../context/NotificationContext';

// ── Props ──

interface NotificationProviderProps {
  dispatcher: NotificationDispatcher;
  children: React.ReactNode;
}

// ── Provider ──

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  dispatcher,
  children,
}) => {
  const [notifications, setNotifications] = useState<UINotification[]>([]);

  // Subscribe to app-layer notifications
  useEffect(() => {
    const unsubscribe = dispatcher.onNotification((n: Notification) => {
      const uiNotif: UINotification = {
        id: n.id,
        type: n.type as UINotification['type'],
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        autoClose: n.autoClose ?? true,
        durationMs: n.durationMs ?? 3000,
      };

      setNotifications((prev) => [...prev, uiNotif]);

      // Auto-dismiss
      if (uiNotif.autoClose && uiNotif.durationMs > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== uiNotif.id));
        }, uiNotif.durationMs);
      }
    });

    return unsubscribe;
  }, [dispatcher]);

  // Direct notification helpers (bypass the dispatcher for purely UI notifications)
  const addNotification = useCallback(
    (type: UINotification['type'], title: string, message: string) => {
      const id = `ui_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const notif: UINotification = {
        id,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
        autoClose: true,
        durationMs: type === 'error' ? 0 : 3000,
      };

      setNotifications((prev) => [...prev, notif]);

      if (notif.autoClose && notif.durationMs > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== id));
        }, notif.durationMs);
      }
    },
    [],
  );

  const success = useCallback(
    (title: string, message: string) => addNotification('success', title, message),
    [addNotification],
  );

  const error = useCallback(
    (title: string, message: string) => addNotification('error', title, message),
    [addNotification],
  );

  const warning = useCallback(
    (title: string, message: string) => addNotification('warning', title, message),
    [addNotification],
  );

  const info = useCallback(
    (title: string, message: string) => addNotification('info', title, message),
    [addNotification],
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: INotificationContextValue = useMemo(
    () => ({
      notifications,
      success,
      error,
      warning,
      info,
      dismiss,
      clearAll,
    }),
    [notifications, success, error, warning, info, dismiss, clearAll],
  );

  return (
    <NotificationReactContext.Provider value={value}>
      {children}
    </NotificationReactContext.Provider>
  );
};
