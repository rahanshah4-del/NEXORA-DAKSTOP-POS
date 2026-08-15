export const IPC_CHANNELS = {
  // Auth
  AUTH_SIGN_IN: 'auth:signIn',
  AUTH_SIGN_OUT: 'auth:signOut',
  AUTH_GET_CURRENT_USER: 'auth:getCurrentUser',
  AUTH_STAFF_PIN_LOGIN: 'auth:staffPinLogin',
  AUTH_GET_STAFF_PROFILE: 'auth:getStaffProfile',
  AUTH_SAVE_LOGIN_CREDS: 'auth:saveLoginCreds',
  AUTH_LOAD_LOGIN_CREDS: 'auth:loadLoginCreds',
  AUTH_CLEAR_LOGIN_CREDS: 'auth:clearLoginCreds',
  AUTH_VERIFY_STAFF_PIN: 'auth:verifyStaffPin',

  // Database
  DB_QUERY: 'db:query',
  DB_EXECUTE: 'db:execute',

  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PLATFORM: 'app:getPlatform',
  APP_CHECK_FOR_UPDATES: 'app:checkForUpdates',

  // Firestore POS Collections
  FIRESTORE_PAYMENTS_CREATE: 'firestore:payments:create',
  FIRESTORE_PAYMENTS_LIST: 'firestore:payments:list',
  FIRESTORE_PAYMENTS_UPDATE: 'firestore:payments:update',
  FIRESTORE_PAYMENTS_CREATE_WITH_ID: 'firestore:payments:createWithId',

  FIRESTORE_CASH_SESSIONS_OPEN: 'firestore:cashSessions:open',
  FIRESTORE_CASH_SESSIONS_CLOSE: 'firestore:cashSessions:close',
  FIRESTORE_CASH_SESSIONS_GET_ACTIVE: 'firestore:cashSessions:getActive',
  FIRESTORE_CASH_SESSIONS_HISTORY: 'firestore:cashSessions:history',

  FIRESTORE_RECIPES_LIST: 'firestore:recipes:list',
  FIRESTORE_RECIPES_GET: 'firestore:recipes:get',
  FIRESTORE_RECIPES_CREATE: 'firestore:recipes:create',
  FIRESTORE_RECIPES_UPDATE: 'firestore:recipes:update',

  FIRESTORE_TABLES_LIST: 'firestore:tables:list',

  FIRESTORE_MENU_ITEMS_LIST: 'firestore:menuItems:list',
  FIRESTORE_MENU_ITEMS_LISTEN: 'firestore:menuItems:listen',
  FIRESTORE_MENU_ITEMS_LISTEN_STOP: 'firestore:menuItems:listenStop',

  FIRESTORE_RESERVATIONS_CREATE: 'firestore:reservations:create',
  FIRESTORE_RESERVATIONS_LIST: 'firestore:reservations:list',
  FIRESTORE_RESERVATIONS_UPDATE: 'firestore:reservations:update',
  FIRESTORE_RESERVATIONS_CANCEL: 'firestore:reservations:cancel',

  FIRESTORE_ORDERS_CREATE: 'firestore:orders:create',
  FIRESTORE_ORDERS_UPDATE: 'firestore:orders:update',
  FIRESTORE_ORDERS_UPDATE_STATUS: 'firestore:orders:updateStatus',
  FIRESTORE_ORDERS_LIST: 'firestore:orders:list',

  FIRESTORE_COUPONS_GET_BY_CODE: 'firestore:coupons:getByCode',
  FIRESTORE_COUPONS_INCREMENT_USAGE: 'firestore:coupons:incrementUsage',

  FIRESTORE_CUSTOMERS_LIST: 'firestore:customers:list',
  FIRESTORE_CUSTOMERS_CREATE: 'firestore:customers:create',
  FIRESTORE_CUSTOMERS_UPDATE: 'firestore:customers:update',

  FIRESTORE_EXPENSES_LIST: 'firestore:expenses:list',
  FIRESTORE_EXPENSES_CREATE: 'firestore:expenses:create',

  FIRESTORE_WALLET_CUSTOMERS_LIST: 'firestore:wallet:customersList',
  FIRESTORE_WALLET_TRANSACTIONS_LIST: 'firestore:wallet:transactionsList',
  FIRESTORE_WALLET_TRANSACTION_ADD: 'firestore:wallet:transactionAdd',

  PRINTER_PRINT_KOT: 'printer:printKOT',
  PRINTER_PRINT_BILL: 'printer:printBill',
  PRINTER_PRINT_REPORT: 'printer:printReport',
  PRINTER_PRINT_KITCHEN_BOARD: 'printer:printKitchenBoard',

  // Local SQLite (offline-first)
  LOCAL_ORDER_WRITE: 'local:order:write',
  LOCAL_ORDER_GET: 'local:order:get',
  LOCAL_ORDER_APPEND_ITEMS: 'local:order:appendItems',
  LOCAL_ORDER_LIST_PENDING: 'local:order:listPending',
  LOCAL_ORDER_CANCEL: 'local:order:cancel',
  LOCAL_ORDER_UPDATE_TYPE: 'local:order:updateType',
  LOCAL_SYNC_PENDING_COUNT: 'local:sync:pendingCount',

  // Logging (renderer → main process)
  APP_LOG: 'app:log',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
