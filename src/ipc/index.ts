/**
 * IPC Layer — barrel export for the Electron IPC Integration Layer.
 *
 * Architecture:
 *   React UI → window.restaurant → Preload → ipcRenderer.invoke()
 *   → ipcMain.handle() → CommandDispatcher/QueryDispatcher
 *   → Application Layer → Repositories → SQLite
 *
 * Security:
 *   - contextIsolation: true
 *   - sandbox: true (required for production)
 *   - nodeIntegration: false
 *   - No raw IPC access from renderer
 *   - All communication through typed channels
 */

// ── Channel Definitions ──
export { RESTAURANT_IPC_CHANNELS } from './restaurant-channels';
export type { RestaurantIpcChannel } from './restaurant-channels';

// ── IPC Types ──
export {
  toIpcResult,
  toIpcListResult,
} from './restaurant-ipc-types';
export type {
  IpcResult,
  IpcListResult,
  RestaurantIpcChannelMap,
  RestaurantIpcChannelName,
} from './restaurant-ipc-types';

// ── Bridge ──
export { exposeRestaurantApi } from './bridge/preload';
export type {
  RestaurantApi,
  RestaurantOrdersApi,
  RestaurantProductsApi,
  RestaurantCustomersApi,
  RestaurantTablesApi,
  RestaurantPaymentsApi,
  RestaurantKitchenApi,
  RestaurantStaffApi,
  RestaurantSettingsApi,
  RestaurantReportsApi,
} from './bridge/types';

// ── Registration ──
export {
  registerRestaurantIpcHandlers,
  updateRestaurantAppContext,
  getRestaurantAppContext,
  isRestaurantHandlersRegistered,
} from './registration';

// ── Handlers ──
export { registerOrderHandlers } from './handlers/order-handlers';
export { registerProductHandlers } from './handlers/product-handlers';
export { registerCustomerHandlers } from './handlers/customer-handlers';
export { registerTableHandlers } from './handlers/table-handlers';
export { registerPaymentHandlers } from './handlers/payment-handlers';
export { registerKitchenHandlers } from './handlers/kitchen-handlers';
export { registerStaffHandlers } from './handlers/staff-handlers';
export { registerSettingsHandlers } from './handlers/settings-handlers';
export { registerReportHandlers } from './handlers/report-handlers';
