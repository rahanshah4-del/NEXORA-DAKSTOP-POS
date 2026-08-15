/**
 * NotificationContext.ts — React Context for UI notifications.
 *
 * Decoupled from the app-layer NotificationDispatcher.
 * Components use useNotification() to fire toasts/notifications.
 */

import { createContext } from 'react';

// ── Types ──

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface UINotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  autoClose: boolean;
  durationMs: number;
}

// ── Context Value ──

export interface INotificationContextValue {
  /** Active notifications displayed in the UI. */
  notifications: UINotification[];

  /** Fire a success notification. */
  success: (title: string, message: string) => void;

  /** Fire an error notification. */
  error: (title: string, message: string) => void;

  /** Fire a warning notification. */
  warning: (title: string, message: string) => void;

  /** Fire an info notification. */
  info: (title: string, message: string) => void;

  /** Remove a notification by ID. */
  dismiss: (id: string) => void;

  /** Clear all notifications. */
  clearAll: () => void;
}

// ── React Context ──

export const NotificationReactContext = createContext<INotificationContextValue | null>(null);
NotificationReactContext.displayName = 'NotificationContext';
