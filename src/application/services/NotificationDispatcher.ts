/**
 * NotificationDispatcher.ts — Sends UI notifications / toasts after operations.
 *
 * Decoupled from the UI — the renderer can subscribe to notification events.
 */

import type { IApplicationService } from '../common/IApplicationService';
import type { ILogger } from '../common/IApplicationService';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  autoClose?: boolean;
  durationMs?: number;
}

export class NotificationDispatcher implements IApplicationService {
  readonly serviceName = 'NotificationDispatcher';
  private _listeners: Array<(notification: Notification) => void> = [];
  private _counter = 0;

  constructor(private _logger: ILogger) {}

  /** Subscribe to notifications (called by the UI layer). */
  onNotification(callback: (notification: Notification) => void): () => void {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== callback);
    };
  }

  /** Send a success notification. */
  success(title: string, message: string): void {
    this._send({ type: 'success', title, message, autoClose: true, durationMs: 3000 });
  }

  /** Send an error notification. */
  error(title: string, message: string): void {
    this._send({ type: 'error', title, message, autoClose: false });
  }

  /** Send a warning notification. */
  warning(title: string, message: string): void {
    this._send({ type: 'warning', title, message, autoClose: true, durationMs: 5000 });
  }

  /** Send an info notification. */
  info(title: string, message: string): void {
    this._send({ type: 'info', title, message, autoClose: true, durationMs: 3000 });
  }

  private _send(partial: Omit<Notification, 'id' | 'timestamp'>): void {
    this._counter++;
    const notification: Notification = {
      ...partial,
      id: `notif_${Date.now()}_${this._counter}`,
      timestamp: new Date().toISOString(),
    };

    this._logger.debug(`Notification: ${notification.type} — ${notification.title}`, {
      notificationId: notification.id,
      type: notification.type,
    });

    for (const listener of this._listeners) {
      try {
        listener(notification);
      } catch {
        // Swallow listener errors
      }
    }
  }
}
