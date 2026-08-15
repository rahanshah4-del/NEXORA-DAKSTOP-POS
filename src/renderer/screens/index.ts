/**
 * React POS Screens — barrel export.
 *
 * Complete desktop POS user interface for the Nexora Restaurant POS.
 * Additive module — no existing renderer files were modified.
 *
 * Architecture:
 *   POSRouter → Screen Components → Presentation Hooks → IPC → Application Layer → SQLite
 *
 * Screens (10):
 *   Dashboard, Billing/POS, Products, Tables, Kitchen Display (KDS),
 *   Customers, Staff, Reports, Settings
 *
 * All screens use:
 *   - Presentation hooks (useOrders, useProducts, useDashboard, etc.)
 *   - ViewModels (OrderViewModel, ProductViewModel, etc.)
 *   - Form system (useForm, validation)
 *   - Notification system (useNotification)
 *   - Existing UI component library (Button, Card, Modal, etc.)
 *
 * Never access repositories or SQLite directly.
 */

// ── Router ──
export { POSRouter } from './POSRouter';

// ── Screens ──
export { DashboardScreen } from './Dashboard/DashboardScreen';
export { BillingScreen } from './Billing/BillingScreen';
export { ProductsScreen } from './Products/ProductsScreen';
export { TablesScreen } from './Tables/TablesScreen';
export { KitchenScreen } from './Kitchen/KitchenScreen';
export { CustomersScreen } from './Customers/CustomersScreen';
export { StaffScreen } from './Staff/StaffScreen';
export { ReportsScreen } from './Reports/ReportsScreen';
export { SettingsScreen } from './Settings/SettingsScreen';
export { CashSessionsScreen } from './CashSessions/CashSessionsScreen';
export { PaymentsScreen } from './Payments/PaymentsScreen';
export { ReservationsScreen } from './Reservations/ReservationsScreen';

// ── Shared Components ──
export { POSShell } from './components/POSShell';
export { Skeleton, CardSkeleton, TableSkeleton, GridSkeleton, DetailSkeleton } from './components/SkeletonLoader';
export { ScreenEmptyState, ScreenErrorState, ScreenUnauthorized } from './components/ScreenStates';
export { AnimatedCounter } from './components/AnimatedCounter';
export { KeyboardShortcuts, POS_SHORTCUTS } from './components/KeyboardShortcuts';
