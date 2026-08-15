/**
 * Presentation Adapters — barrel export.
 *
 * Mock adapter hooks that bridge Phase 13 screens to the existing
 * Zustand stores + ViewModels WITHOUT any backend integration.
 *
 * Every mock hook has the SAME interface as the real presentation hook.
 * Phase 18 will swap these for the real IPC-connected hooks.
 *
 * Uses:
 *   - Existing Zustand stores (menu-store, customer-store, settings-store, toast-store)
 *   - Existing ViewModels (OrderViewModel, ProductViewModel, etc.)
 *   - Existing validation (useForm, validation rules)
 *
 * Never uses:
 *   - IPC (window.restaurant.*)
 *   - SQLite
 *   - Repositories
 *   - CommandDispatcher / QueryDispatcher
 *   - DI Container
 */

export { MockProvider, useMockAppContext } from './MockProvider';
export type { MockAppContextValue } from './MockProvider';

export { useMockOrders } from './useMockOrders';
export { useMockProducts } from './useMockProducts';
export { useMockCustomers } from './useMockCustomers';
export { useMockTables } from './useMockTables';
export { useMockPayments } from './useMockPayments';
export { useMockKitchen } from './useMockKitchen';
export { useMockStaff } from './useMockStaff';
export { useMockDashboard } from './useMockDashboard';
export { useMockReports } from './useMockReports';
export { useMockSettings } from './useMockSettings';
