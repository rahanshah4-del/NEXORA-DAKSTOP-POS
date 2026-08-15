/**
 * Presentation Layer — barrel export.
 *
 * Connects the React UI to the CQRS Application Layer.
 *
 * Architecture:
 *   UI Components → Presentation Hooks → Dispatchers → Application Layer → Domain → Repositories
 *
 * Layers:
 *   providers/     — React Context providers (ApplicationProvider, NotificationProvider)
 *   context/       — React Context definitions
 *   hooks/         — Command/Query hooks + domain-specific hooks
 *   viewModels/    — Domain → UI data transformation
 *   forms/         — Form state management + validation
 *   state/         — Lightweight observable state
 */

// ── Providers ──
export { ApplicationProvider } from './providers/ApplicationProvider';
export { NotificationProvider } from './providers/NotificationProvider';

// ── Context ──
export {
  ApplicationReactContext,
  type IApplicationContextValue,
} from './context/ApplicationContext';

export {
  NotificationReactContext,
  type INotificationContextValue,
  type UINotification,
  type NotificationType,
} from './context/NotificationContext';

// ── Core Hooks ──
export { useApplication, useAppContext, useIsReady } from './hooks/useApplication';
export { useNotification } from './hooks/useNotification';
export { useCommand, type UseCommandState } from './hooks/useCommand';
export { useQuery, type UseQueryState, type UseQueryOptions } from './hooks/useQuery';

// ── Domain Hooks ──
export { useOrders } from './hooks/useOrders';
export { useProducts } from './hooks/useProducts';
export { useCustomers } from './hooks/useCustomers';
export { useTables } from './hooks/useTables';
export { usePayments } from './hooks/usePayments';
export { useKitchen } from './hooks/useKitchen';
export { useStaff } from './hooks/useStaff';
export { useSettings } from './hooks/useSettings';
export { useReports } from './hooks/useReports';
export { useDashboard } from './hooks/useDashboard';

// ── ViewModels ──
export {
  OrderViewModel,
  type OrderViewData,
  type OrderItemViewData,
} from './viewModels/OrderViewModel';

export {
  ProductViewModel,
  type ProductViewData,
} from './viewModels/ProductViewModel';

export {
  CustomerViewModel,
  type CustomerViewData,
} from './viewModels/CustomerViewModel';

export {
  TableViewModel,
  type TableViewData,
} from './viewModels/TableViewModel';

export {
  DashboardViewModel,
  type DashboardCardData,
  type SalesChartPoint,
} from './viewModels/DashboardViewModel';

// ── Forms ──
export { useForm, type UseFormReturn } from './forms/useForm';
export {
  validate,
  validateField,
  required,
  minLength,
  maxLength,
  positiveNumber,
  email,
  pattern,
  oneOf,
  ORDER_SCHEMA,
  PRODUCT_SCHEMA,
  CUSTOMER_SCHEMA,
  TABLE_SCHEMA,
  EMPLOYEE_SCHEMA,
  type ValidationRule,
  type ValidationSchema,
  type ValidationResult,
  type ValidationError,
} from './forms/validation';

export {
  useOrderForm,
  addItemToOrder,
  removeItemFromOrder,
  updateItemQuantity,
  totalItemCount,
  hasItems,
  type OrderFormValues,
  DEFAULT_ORDER_VALUES,
} from './forms/orderForm';

// ── State ──
export {
  ObservableStore,
  useStore,
  useSelector,
  useLocalStore,
  type Listener,
  type Updater,
  type Middleware,
} from './state/useObservableState';
