/**
 * bridge/preload.ts — Electron preload script exposing window.restaurant.
 *
 * Uses contextBridge.exposeInMainWorld() to safely expose the restaurant
 * POS API to the renderer process. The renderer NEVER accesses ipcRenderer,
 * fs, sqlite, better-sqlite3, process, or require directly.
 *
 * Security:
 *   - contextIsolation: true (enforced by BrowserWindow config)
 *   - Only ipcRenderer.invoke is used (no .send/.on)
 *   - All values are plain JSON-serializable objects
 *   - No node modules leaked to renderer
 *
 * Integration:
 *   This module should be imported by the main preload script:
 *     import { exposeRestaurantApi } from '../ipc/bridge/preload';
 *     exposeRestaurantApi();
 *   Or used as the sole preload by updating BrowserWindow config.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { RESTAURANT_IPC_CHANNELS } from '../restaurant-channels';
import type {
  RestaurantApi,
  IpcResult,
  IpcListResult,
  OrderCreateRequest,
  PaymentProcessRequest,
  TableAllocateRequest,
  StaffClockInRequest,
  StaffClockOutRequest,
} from './types';

/**
 * Expose the restaurant API on window.restaurant.
 * Call once during preload initialization.
 */
export function exposeRestaurantApi(): void {
  const api: RestaurantApi = {
    // ── Orders ──
    orders: {
      create: (data: OrderCreateRequest) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_CREATE, data),
      update: (data: Record<string, unknown>) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE, data),
      cancel: (orderId: string, reason?: string) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_CANCEL, { orderId, reason }),
      get: (orderId: string) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_GET, { orderId }),
      getWithItems: (orderId: string) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_GET_WITH_ITEMS, { orderId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_LIST, opts ?? {}),
      listActive: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_ACTIVE),
      listByTable: (tableId: string) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_TABLE, { tableId }),
      listByStatus: (status: string) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_STATUS, { status }),
      addItem: (orderId, productId, quantity, notes) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_ADD_ITEM, { orderId, productId, quantity, notes }),
      removeItem: (orderId, itemId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_REMOVE_ITEM, { orderId, itemId }),
      updateStatus: (orderId, status) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_STATUS, { orderId, status }),
      updatePayment: (orderId, paymentStatus, paymentMethod) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_PAYMENT, { orderId, paymentStatus, paymentMethod }),
      getNextNumber: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.ORDERS_GET_NEXT_NUMBER),
    },

    // ── Products ──
    products: {
      create: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_CREATE, data),
      update: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE, data),
      delete: (productId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_DELETE, { productId }),
      get: (productId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_GET, { productId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST, opts ?? {}),
      listActive: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST_ACTIVE, opts ?? {}),
      search: (query, limit) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_SEARCH, { query, limit }),
      getBySku: (sku) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_GET_BY_SKU, { sku }),
      updatePrice: (productId, priceCents) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE_PRICE, { productId, priceCents }),
      bulkUpdatePrice: (productIds, priceAdjustmentPercent, reason) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PRODUCTS_BULK_UPDATE_PRICE, { productIds, priceAdjustmentPercent, reason }),
    },

    // ── Customers ──
    customers: {
      create: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_CREATE, data),
      update: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_UPDATE, data),
      delete: (customerId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_DELETE, { customerId }),
      get: (customerId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET, { customerId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_LIST, opts ?? {}),
      search: (query, limit) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_SEARCH, { query, limit }),
      getByEmail: (email) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_BY_EMAIL, { email }),
      getTop: (metric, limit) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_TOP, { metric, limit }),
    },

    // ── Tables ──
    tables: {
      create: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_CREATE, data),
      update: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_UPDATE, data),
      delete: (tableId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_DELETE, { tableId }),
      get: (tableId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_GET, { tableId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_LIST, opts ?? {}),
      listAvailable: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_LIST_AVAILABLE),
      updateStatus: (tableId, status) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_UPDATE_STATUS, { tableId, status }),
      allocate: (request: TableAllocateRequest) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_ALLOCATE, request),
      assignOrder: (tableId, orderId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_ASSIGN_ORDER, { tableId, orderId }),
      clearOrder: (tableId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.TABLES_CLEAR_ORDER, { tableId }),
    },

    // ── Payments ──
    payments: {
      process: (data: PaymentProcessRequest) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_PROCESS, data),
      refund: (paymentId, amountCents, reason) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_REFUND, { paymentId, amountCents, reason }),
      void: (paymentId, reason) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_VOID, { paymentId, reason }),
      get: (paymentId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_GET, { paymentId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST, opts ?? {}),
      listByOrder: (orderId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST_BY_ORDER, { orderId }),
      totalsByMethod: (startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.PAYMENTS_TOTALS_BY_METHOD, { startDate, endDate }),
    },

    // ── Kitchen ──
    kitchen: {
      createTicket: (orderId, priority) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_CREATE_TICKET, { orderId, priority }),
      updateStatus: (ticketId, status) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_STATUS, { ticketId, status }),
      completeTicket: (ticketId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_COMPLETE_TICKET, { ticketId }),
      updateItemStatus: (itemId, status) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_ITEM_STATUS, { itemId, status }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_LIST, opts ?? {}),
      getQueue: (displayId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_GET_QUEUE, { displayId }),
      getTicketItems: (ticketId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_GET_TICKET_ITEMS, { ticketId }),
      markAllReady: (ticketId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.KITCHEN_MARK_ALL_READY, { ticketId }),
    },

    // ── Staff ──
    staff: {
      create: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_CREATE, data),
      update: (data) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_UPDATE, data),
      deactivate: (employeeId, reason) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_DEACTIVATE, { employeeId, reason }),
      get: (employeeId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_GET, { employeeId }),
      list: (opts) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_LIST, opts ?? {}),
      listActive: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_LIST_ACTIVE),
      clockIn: (data: StaffClockInRequest) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_IN, data),
      clockOut: (data: StaffClockOutRequest) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_OUT, data),
      getActiveShift: (employeeId) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFT, { employeeId }),
      getActiveShifts: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFTS),
      getShiftHistory: (employeeId, startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.STAFF_GET_SHIFT_HISTORY, { employeeId, startDate, endDate }),
    },

    // ── Settings ──
    settings: {
      get: (key) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_GET, { key }),
      set: (key, value) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_SET, { key, value }),
      setBatch: (settings) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_SET_BATCH, { settings }),
      delete: (key) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_DELETE, { key }),
      list: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_LIST),
      hasKey: (key) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_HAS_KEY, { key }),
      exportJson: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_EXPORT),
      importJson: (json) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.SETTINGS_IMPORT, { json }),
    },

    // ── Reports ──
    reports: {
      sales: (startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_SALES, { startDate, endDate }),
      revenue: (startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_REVENUE, { startDate, endDate }),
      dashboard: () =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_DASHBOARD),
      topProducts: (startDate, endDate, limit) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_TOP_PRODUCTS, { startDate, endDate, limit }),
      paymentMethods: (startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_PAYMENT_METHODS, { startDate, endDate }),
      staffPerformance: (startDate, endDate) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_STAFF_PERFORMANCE, { startDate, endDate }),
      dailySummary: (date) =>
        ipcRenderer.invoke(RESTAURANT_IPC_CHANNELS.REPORTS_DAILY_SUMMARY, { date }),
    },
  };

  contextBridge.exposeInMainWorld('restaurant', api);
}
