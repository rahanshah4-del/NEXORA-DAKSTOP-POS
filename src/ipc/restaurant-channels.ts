/**
 * restaurant-channels.ts — Restaurant POS IPC channel constants.
 *
 * All channels follow the pattern: <entity>:<operation>
 * Uses `as const` for strict type safety.
 *
 * Additive only — does NOT modify existing channels.ts.
 */

export const RESTAURANT_IPC_CHANNELS = {
  // ── Orders ──
  ORDERS_CREATE: 'orders:create',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_CANCEL: 'orders:cancel',
  ORDERS_GET: 'orders:get',
  ORDERS_GET_WITH_ITEMS: 'orders:getWithItems',
  ORDERS_LIST: 'orders:list',
  ORDERS_LIST_ACTIVE: 'orders:listActive',
  ORDERS_LIST_BY_TABLE: 'orders:listByTable',
  ORDERS_LIST_BY_STATUS: 'orders:listByStatus',
  ORDERS_ADD_ITEM: 'orders:addItem',
  ORDERS_REMOVE_ITEM: 'orders:removeItem',
  ORDERS_UPDATE_STATUS: 'orders:updateStatus',
  ORDERS_UPDATE_PAYMENT: 'orders:updatePayment',
  ORDERS_GET_NEXT_NUMBER: 'orders:getNextNumber',

  // ── Products ──
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_GET: 'products:get',
  PRODUCTS_LIST: 'products:list',
  PRODUCTS_LIST_ACTIVE: 'products:listActive',
  PRODUCTS_SEARCH: 'products:search',
  PRODUCTS_GET_BY_SKU: 'products:getBySku',
  PRODUCTS_UPDATE_PRICE: 'products:updatePrice',
  PRODUCTS_BULK_UPDATE_PRICE: 'products:bulkUpdatePrice',

  // ── Customers ──
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_GET: 'customers:get',
  CUSTOMERS_LIST: 'customers:list',
  CUSTOMERS_SEARCH: 'customers:search',
  CUSTOMERS_GET_BY_EMAIL: 'customers:getByEmail',
  CUSTOMERS_GET_TOP: 'customers:getTop',

  // ── Tables ──
  TABLES_CREATE: 'tables:create',
  TABLES_UPDATE: 'tables:update',
  TABLES_DELETE: 'tables:delete',
  TABLES_GET: 'tables:get',
  TABLES_LIST: 'tables:list',
  TABLES_LIST_AVAILABLE: 'tables:listAvailable',
  TABLES_UPDATE_STATUS: 'tables:updateStatus',
  TABLES_ALLOCATE: 'tables:allocate',
  TABLES_ASSIGN_ORDER: 'tables:assignOrder',
  TABLES_CLEAR_ORDER: 'tables:clearOrder',

  // ── Payments ──
  PAYMENTS_PROCESS: 'payments:process',
  PAYMENTS_REFUND: 'payments:refund',
  PAYMENTS_VOID: 'payments:void',
  PAYMENTS_GET: 'payments:get',
  PAYMENTS_LIST: 'payments:list',
  PAYMENTS_LIST_BY_ORDER: 'payments:listByOrder',
  PAYMENTS_TOTALS_BY_METHOD: 'payments:totalsByMethod',

  // ── Kitchen ──
  KITCHEN_CREATE_TICKET: 'kitchen:createTicket',
  KITCHEN_UPDATE_STATUS: 'kitchen:updateStatus',
  KITCHEN_COMPLETE_TICKET: 'kitchen:completeTicket',
  KITCHEN_UPDATE_ITEM_STATUS: 'kitchen:updateItemStatus',
  KITCHEN_LIST: 'kitchen:list',
  KITCHEN_GET_QUEUE: 'kitchen:getQueue',
  KITCHEN_GET_TICKET_ITEMS: 'kitchen:getTicketItems',
  KITCHEN_MARK_ALL_READY: 'kitchen:markAllReady',

  // ── Staff ──
  STAFF_CREATE: 'staff:create',
  STAFF_UPDATE: 'staff:update',
  STAFF_DEACTIVATE: 'staff:deactivate',
  STAFF_GET: 'staff:get',
  STAFF_LIST: 'staff:list',
  STAFF_LIST_ACTIVE: 'staff:listActive',
  STAFF_CLOCK_IN: 'staff:clockIn',
  STAFF_CLOCK_OUT: 'staff:clockOut',
  STAFF_GET_ACTIVE_SHIFT: 'staff:getActiveShift',
  STAFF_GET_ACTIVE_SHIFTS: 'staff:getActiveShifts',
  STAFF_GET_SHIFT_HISTORY: 'staff:getShiftHistory',

  // ── Settings ──
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_SET_BATCH: 'settings:setBatch',
  SETTINGS_DELETE: 'settings:delete',
  SETTINGS_LIST: 'settings:list',
  SETTINGS_HAS_KEY: 'settings:hasKey',
  SETTINGS_EXPORT: 'settings:export',
  SETTINGS_IMPORT: 'settings:import',

  // ── Reports ──
  REPORTS_SALES: 'reports:sales',
  REPORTS_REVENUE: 'reports:revenue',
  REPORTS_DASHBOARD: 'reports:dashboard',
  REPORTS_TOP_PRODUCTS: 'reports:topProducts',
  REPORTS_PAYMENT_METHODS: 'reports:paymentMethods',
  REPORTS_STAFF_PERFORMANCE: 'reports:staffPerformance',
  REPORTS_DAILY_SUMMARY: 'reports:dailySummary',
} as const;

export type RestaurantIpcChannel =
  (typeof RESTAURANT_IPC_CHANNELS)[keyof typeof RESTAURANT_IPC_CHANNELS];
