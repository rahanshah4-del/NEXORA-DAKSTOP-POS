/**
 * NotificationService — Cross-cutting notification dispatch for restaurant operations.
 *
 * Sends UI notifications for important events:
 *   - Order status changes
 *   - Kitchen ticket updates
 *   - Payment completions
 *   - Low stock alerts
 *   - Shift reminders
 *   - Error alerts
 *
 * Decoupled from UI — the renderer subscribes to `onNotification`.
 */

// ── Types ──

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationCategory =
  | 'order'
  | 'payment'
  | 'kitchen'
  | 'inventory'
  | 'staff'
  | 'table'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  autoClose: boolean;
  durationMs: number;
  data?: Record<string, unknown>;
}

export type NotificationListener = (notification: Notification) => void;

export interface NotificationPreferences {
  orderUpdates: boolean;
  paymentUpdates: boolean;
  kitchenAlerts: boolean;
  lowStockAlerts: boolean;
  staffAlerts: boolean;
  systemAlerts: boolean;
  soundEnabled: boolean;
}

// ── Service ──

export class NotificationService {
  private listeners: NotificationListener[] = [];
  private counter = 0;
  private history: Notification[] = [];
  private maxHistory = 200;

  private prefs: NotificationPreferences = {
    orderUpdates: true,
    paymentUpdates: true,
    kitchenAlerts: true,
    lowStockAlerts: true,
    staffAlerts: false,
    systemAlerts: true,
    soundEnabled: false,
  };

  // ── Listener Management ──

  /** Subscribe to all notifications. Returns unsubscribe function. */
  onNotification(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Get the notification history. */
  getHistory(limit: number = 50): Notification[] {
    return this.history.slice(-limit);
  }

  /** Clear notification history. */
  clearHistory(): void {
    this.history = [];
  }

  /** Update notification preferences. */
  setPreferences(prefs: Partial<NotificationPreferences>): void {
    this.prefs = { ...this.prefs, ...prefs };
  }

  // ── Order Notifications ──

  orderCreated(orderNumber: number, tableName?: string): void {
    if (!this.prefs.orderUpdates) return;
    this.send({
      type: 'success',
      category: 'order',
      title: 'Order Created',
      message: tableName
        ? `Order #${orderNumber} — ${tableName}`
        : `Order #${orderNumber} created`,
      autoClose: true,
      durationMs: 3000,
      data: { orderNumber, tableName },
    });
  }

  orderReady(orderNumber: number, tableName?: string): void {
    if (!this.prefs.orderUpdates) return;
    this.send({
      type: 'success',
      category: 'order',
      title: 'Order Ready',
      message: `Order #${orderNumber} is ready to serve`,
      autoClose: true,
      durationMs: 4000,
      data: { orderNumber, tableName },
    });
  }

  orderCancelled(orderNumber: number, reason?: string): void {
    if (!this.prefs.orderUpdates) return;
    this.send({
      type: 'warning',
      category: 'order',
      title: 'Order Cancelled',
      message: reason
        ? `Order #${orderNumber} cancelled: ${reason}`
        : `Order #${orderNumber} cancelled`,
      autoClose: true,
      durationMs: 5000,
      data: { orderNumber, reason },
    });
  }

  // ── Payment Notifications ──

  paymentReceived(orderNumber: number, amountCents: number, method: string): void {
    if (!this.prefs.paymentUpdates) return;
    const dollars = (amountCents / 100).toFixed(2);
    this.send({
      type: 'success',
      category: 'payment',
      title: 'Payment Received',
      message: `Order #${orderNumber}: $${dollars} via ${method}`,
      autoClose: true,
      durationMs: 3000,
      data: { orderNumber, amountCents, method },
    });
  }

  paymentRefunded(orderNumber: number, amountCents: number): void {
    if (!this.prefs.paymentUpdates) return;
    const dollars = (amountCents / 100).toFixed(2);
    this.send({
      type: 'warning',
      category: 'payment',
      title: 'Payment Refunded',
      message: `Order #${orderNumber}: $${dollars} refunded`,
      autoClose: true,
      durationMs: 5000,
      data: { orderNumber, amountCents },
    });
  }

  // ── Kitchen Notifications ──

  kitchenTicketCreated(tableName: string, itemCount: number): void {
    if (!this.prefs.kitchenAlerts) return;
    this.send({
      type: 'info',
      category: 'kitchen',
      title: 'Kitchen Ticket',
      message: `New order for ${tableName} — ${itemCount} items`,
      autoClose: true,
      durationMs: 4000,
      data: { tableName, itemCount },
    });
  }

  kitchenItemReady(ticketId: string, itemName: string): void {
    if (!this.prefs.kitchenAlerts) return;
    this.send({
      type: 'info',
      category: 'kitchen',
      title: 'Item Ready',
      message: `"${itemName}" is ready`,
      autoClose: true,
      durationMs: 3000,
      data: { ticketId, itemName },
    });
  }

  kitchenTicketComplete(tableName: string): void {
    if (!this.prefs.kitchenAlerts) return;
    this.send({
      type: 'success',
      category: 'kitchen',
      title: 'Order Complete',
      message: `${tableName} order is ready for service`,
      autoClose: true,
      durationMs: 5000,
      data: { tableName },
    });
  }

  // ── Inventory Notifications ──

  lowStock(itemName: string, quantityOnHand: number, reorderPoint: number): void {
    if (!this.prefs.lowStockAlerts) return;
    this.send({
      type: 'warning',
      category: 'inventory',
      title: 'Low Stock Alert',
      message: `"${itemName}" is low: ${quantityOnHand} remaining (reorder at ${reorderPoint})`,
      autoClose: false,
      durationMs: 0,
      data: { itemName, quantityOnHand, reorderPoint },
    });
  }

  outOfStock(itemName: string): void {
    if (!this.prefs.lowStockAlerts) return;
    this.send({
      type: 'error',
      category: 'inventory',
      title: 'Out of Stock',
      message: `"${itemName}" is out of stock`,
      autoClose: false,
      durationMs: 0,
      data: { itemName },
    });
  }

  // ── Staff Notifications ──

  staffClockedIn(employeeName: string): void {
    if (!this.prefs.staffAlerts) return;
    this.send({
      type: 'info',
      category: 'staff',
      title: 'Clock In',
      message: `${employeeName} clocked in`,
      autoClose: true,
      durationMs: 3000,
      data: { employeeName },
    });
  }

  staffClockedOut(employeeName: string, hoursWorked: number): void {
    if (!this.prefs.staffAlerts) return;
    this.send({
      type: 'info',
      category: 'staff',
      title: 'Clock Out',
      message: `${employeeName} clocked out (${hoursWorked.toFixed(1)}h)`,
      autoClose: true,
      durationMs: 3000,
      data: { employeeName, hoursWorked },
    });
  }

  // ── Table Notifications ──

  tableAssigned(tableName: string, partySize: number): void {
    this.send({
      type: 'info',
      category: 'table',
      title: 'Table Assigned',
      message: `${tableName} — Party of ${partySize}`,
      autoClose: true,
      durationMs: 3000,
      data: { tableName, partySize },
    });
  }

  // ── System Notifications ──

  systemError(title: string, message: string): void {
    if (!this.prefs.systemAlerts) return;
    this.send({
      type: 'error',
      category: 'system',
      title,
      message,
      autoClose: false,
      durationMs: 0,
    });
  }

  syncComplete(pushed: number, pulled: number): void {
    if (!this.prefs.systemAlerts) return;
    this.send({
      type: 'info',
      category: 'system',
      title: 'Sync Complete',
      message: `Pushed: ${pushed}, Pulled: ${pulled}`,
      autoClose: true,
      durationMs: 3000,
    });
  }

  // ── Generic Send ──

  send(partial: Omit<Notification, 'id' | 'timestamp'>): void {
    this.counter++;
    const notification: Notification = {
      ...partial,
      id: `notif_${Date.now()}_${this.counter}`,
      timestamp: new Date().toISOString(),
    };

    // Add to history
    this.history.push(notification);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Dispatch to listeners
    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch {
        // Swallow listener errors
      }
    }
  }
}
