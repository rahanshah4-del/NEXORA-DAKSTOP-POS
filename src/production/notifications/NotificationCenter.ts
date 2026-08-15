/**
 * NotificationCenter — Global notification hub with optional sound.
 */

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error' | 'critical';

export interface AppNotification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  sound?: 'chime' | 'alert' | 'error' | 'none';
  action?: { label: string; handler: () => void };
}

export class NotificationCenter {
  private notifications: AppNotification[] = [];
  private maxStored = 200;
  private listeners: Array<(n: AppNotification) => void> = [];
  private soundEnabled = true;

  /** Send a notification. */
  notify(
    level: NotificationLevel,
    title: string,
    message: string,
    options?: { sound?: AppNotification['sound']; action?: AppNotification['action'] },
  ): AppNotification {
    const n: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      level, title, message, timestamp: new Date().toISOString(), read: false,
      sound: options?.sound, action: options?.action,
    };

    this.notifications.unshift(n);
    if (this.notifications.length > this.maxStored) this.notifications.pop();

    for (const listener of this.listeners) {
      try { listener(n); } catch { /* swallow */ }
    }

    if (this.soundEnabled && n.sound && n.sound !== 'none') {
      this.playSound(n.sound);
    }

    return n;
  }

  // Convenience methods
  info(title: string, message: string) { return this.notify('info', title, message); }
  success(title: string, message: string) { return this.notify('success', title, message, { sound: 'chime' }); }
  warning(title: string, message: string) { return this.notify('warning', title, message, { sound: 'alert' }); }
  error(title: string, message: string) { return this.notify('error', title, message, { sound: 'error' }); }
  critical(title: string, message: string) { return this.notify('critical', title, message, { sound: 'error' }); }

  /** Subscribe to all notifications. */
  onNotification(callback: (n: AppNotification) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  /** Mark as read. */
  markRead(id: string): void {
    const n = this.notifications.find(x => x.id === id);
    if (n) n.read = true;
  }

  /** Get unread count. */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /** Get all notifications. */
  getAll(limit = 50): AppNotification[] {
    return this.notifications.slice(0, limit);
  }

  /** Clear all notifications. */
  clear(): void { this.notifications = []; }

  /** Toggle sound. */
  setSoundEnabled(enabled: boolean): void { this.soundEnabled = enabled; }

  /** Play a notification sound. */
  private playSound(sound: string): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);

      switch (sound) {
        case 'chime': osc.frequency.value = 660; gain.gain.value = 0.08; osc.start(); osc.stop(ctx.currentTime + 0.15); break;
        case 'alert': osc.frequency.value = 440; gain.gain.value = 0.12; osc.start(); osc.stop(ctx.currentTime + 0.3); break;
        case 'error': osc.frequency.value = 220; gain.gain.value = 0.15; osc.start(); osc.stop(ctx.currentTime + 0.5); break;
      }
    } catch { /* Web Audio not available */ }
  }
}

export const notificationCenter = new NotificationCenter();
