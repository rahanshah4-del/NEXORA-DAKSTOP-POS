/**
 * IpcEventBus — Real-time IPC event system for cross-process notifications.
 *
 * Main process publishes events → renderer screens auto-refresh affected data.
 * NO polling. NO setInterval. Pure push-based IPC events.
 *
 * Architecture:
 *   Main Process (after DB write) → ipcMain sends event
 *   Renderer (useIpcEvent hook)    → ipcRenderer receives → auto-refetch
 */

// ── Event Types ──

export const IPC_EVENTS = {
  ORDER_CREATED: 'event:order.created',
  ORDER_UPDATED: 'event:order.updated',
  ORDER_DELETED: 'event:order.deleted',
  ORDER_COMPLETED: 'event:order.completed',
  ORDER_CANCELLED: 'event:order.cancelled',

  TABLE_UPDATED: 'event:table.updated',
  TABLE_CLOSED: 'event:table.closed',
  TABLE_OPENED: 'event:table.opened',

  PRODUCT_CREATED: 'event:product.created',
  PRODUCT_UPDATED: 'event:product.updated',
  PRODUCT_DELETED: 'event:product.deleted',

  CUSTOMER_UPDATED: 'event:customer.updated',

  PAYMENT_COMPLETED: 'event:payment.completed',
  PAYMENT_REFUNDED: 'event:payment.refunded',

  KITCHEN_TICKET_CREATED: 'event:kitchen.ticket.created',
  KITCHEN_TICKET_UPDATED: 'event:kitchen.ticket.updated',
  KITCHEN_TICKET_COMPLETED: 'event:kitchen.ticket.completed',
  KITCHEN_ITEM_READY: 'event:kitchen.item.ready',

  STAFF_CLOCK_IN: 'event:staff.clockin',
  STAFF_CLOCK_OUT: 'event:staff.clockout',

  SETTINGS_UPDATED: 'event:settings.updated',

  DASHBOARD_REFRESH: 'event:dashboard.refresh',
  BACKUP_COMPLETED: 'event:backup.completed',
  SYNC_COMPLETED: 'event:sync.completed',
  HARDWARE_STATUS: 'event:hardware.status',
} as const;

export type IpcEventType = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS];

export interface IpcEventPayload {
  type: IpcEventType;
  entityId?: string;
  entityType?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

// ── Event → Screen Mapping ──

/** Maps IPC events to the screens/hooks that should refresh. */
export const EVENT_SCREEN_MAP: Record<string, string[]> = {
  [IPC_EVENTS.ORDER_CREATED]: ['orders', 'dashboard', 'kitchen', 'tables'],
  [IPC_EVENTS.ORDER_UPDATED]: ['orders', 'dashboard', 'kitchen'],
  [IPC_EVENTS.ORDER_COMPLETED]: ['orders', 'dashboard', 'tables'],
  [IPC_EVENTS.ORDER_CANCELLED]: ['orders', 'dashboard', 'tables'],
  [IPC_EVENTS.TABLE_UPDATED]: ['tables', 'dashboard'],
  [IPC_EVENTS.TABLE_OPENED]: ['tables', 'dashboard'],
  [IPC_EVENTS.TABLE_CLOSED]: ['tables', 'dashboard'],
  [IPC_EVENTS.PRODUCT_CREATED]: ['products'],
  [IPC_EVENTS.PRODUCT_UPDATED]: ['products'],
  [IPC_EVENTS.CUSTOMER_UPDATED]: ['customers'],
  [IPC_EVENTS.PAYMENT_COMPLETED]: ['orders', 'dashboard', 'reports'],
  [IPC_EVENTS.PAYMENT_REFUNDED]: ['orders', 'dashboard', 'reports'],
  [IPC_EVENTS.KITCHEN_TICKET_CREATED]: ['kitchen', 'dashboard'],
  [IPC_EVENTS.KITCHEN_TICKET_UPDATED]: ['kitchen'],
  [IPC_EVENTS.KITCHEN_TICKET_COMPLETED]: ['kitchen', 'dashboard'],
  [IPC_EVENTS.KITCHEN_ITEM_READY]: ['kitchen'],
  [IPC_EVENTS.STAFF_CLOCK_IN]: ['staff', 'dashboard'],
  [IPC_EVENTS.STAFF_CLOCK_OUT]: ['staff', 'dashboard'],
  [IPC_EVENTS.SETTINGS_UPDATED]: ['settings'],
  [IPC_EVENTS.DASHBOARD_REFRESH]: ['dashboard'],
};
