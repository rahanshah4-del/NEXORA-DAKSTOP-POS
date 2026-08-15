/**
 * ipc-bridge.ts — Maps CQRS command/query types to window.restaurant IPC calls.
 *
 * This is the bridge between the presentation hooks and the Electron IPC layer.
 * When running in Electron with window.restaurant available, all commands and
 * queries go through IPC → Main Process → Application Layer → Repositories → SQLite.
 *
 * When window.restaurant is NOT available (browser dev mode), falls back to
 * local mock behaviour so development can continue without Electron.
 */

import type { Result } from '../../application/common/Result';
import type { PaginatedResult } from '../../application/common/IQueryHandler';

// ── Detect Electron ──

function hasIpc(): boolean {
  return typeof window !== 'undefined' && !!(window as any).restaurant;
}

function getRestaurantApi(): any {
  return (window as any).restaurant;
}

// ── Convert IPC result shapes to application Result shapes ──

interface IpcApiResult<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  validationErrors?: Array<{ field: string; code: string; message: string }>;
}

function ipcToResult<T>(ipc: IpcApiResult<T>): Result<T> {
  return {
    isSuccess: ipc.success,
    value: ipc.data,
    error: ipc.error,
    errorCode: null,
    validationErrors: (ipc.validationErrors ?? []).map((e: any) => ({
      field: e.field, code: e.code, message: e.message,
    })),
    warnings: [],
    exception: null,
  } as unknown as Result<T>;
}

function ipcToPaginatedResult<T>(ipc: IpcApiResult<{
  items: T[]; totalCount: number; offset: number; limit: number;
  hasNextPage: boolean; hasPreviousPage: boolean;
}>): Result<PaginatedResult<T>> {
  if (!ipc.success || !ipc.data) {
    return {
      isSuccess: false, value: null, error: ipc.error,
      errorCode: null, validationErrors: [], warnings: [], exception: null,
    } as unknown as Result<PaginatedResult<T>>;
  }
  return {
    isSuccess: true,
    value: {
      items: ipc.data.items,
      totalCount: ipc.data.totalCount,
      offset: ipc.data.offset,
      limit: ipc.data.limit,
      hasNextPage: ipc.data.hasNextPage,
      hasPreviousPage: ipc.data.hasPreviousPage,
      totalPages: Math.ceil(ipc.data.totalCount / Math.max(1, ipc.data.limit)),
      executionTimeMs: 0,
    },
    error: null, errorCode: null, validationErrors: [], warnings: [], exception: null,
  } as unknown as Result<PaginatedResult<T>>;
}

// ── Command Dispatch via IPC ──

// Maps CQRS command types to window.restaurant IPC calls
const COMMAND_IPC_MAP: Record<string, (data: any) => Promise<any>> = {
  // Orders
  ICreateOrderCommand: (d) => getRestaurantApi()?.orders.create(d),
  IUpdateOrderCommand: (d) => getRestaurantApi()?.orders.update(d),
  ICancelOrderCommand: (d) => getRestaurantApi()?.orders.cancel(d.orderId, d.reason),
  IAddOrderItemCommand: (d) => getRestaurantApi()?.orders.addItem(d.orderId, d.productId, d.quantity, d.notes),
  IRemoveOrderItemCommand: (d) => getRestaurantApi()?.orders.removeItem(d.orderId, d.itemId),
  IUpdateOrderStatusCommand: (d) => getRestaurantApi()?.orders.updateStatus(d.orderId, d.status),
  IUpdatePaymentStatusCommand: (d) => getRestaurantApi()?.orders.updatePayment(d.orderId, d.paymentStatus, d.paymentMethod),

  // Products
  ICreateProductCommand: (d) => getRestaurantApi()?.products.create(d),
  IUpdateProductCommand: (d) => getRestaurantApi()?.products.update(d),
  IUpdateProductPriceCommand: (d) => getRestaurantApi()?.products.updatePrice(d.productId, d.priceCents),
  IBulkUpdatePriceCommand: (d) => getRestaurantApi()?.products.bulkUpdatePrice(d.productIds, d.priceAdjustmentPercent, d.reason),
  IActivateProductCommand: (d) => getRestaurantApi()?.products.update({ productId: d.productId, isActive: true }),
  IDeactivateProductCommand: (d) => getRestaurantApi()?.products.delete(d.productId),

  // Customers
  ICreateCustomerCommand: (d) => getRestaurantApi()?.customers.create(d),
  IUpdateCustomerCommand: (d) => getRestaurantApi()?.customers.update(d),

  // Tables
  ICreateTableCommand: (d) => getRestaurantApi()?.tables.create(d),
  IUpdateTableCommand: (d) => getRestaurantApi()?.tables.update(d),
  IUpdateTableStatusCommand: (d) => getRestaurantApi()?.tables.updateStatus(d.tableId, d.status),
  IOpenTableCommand: (d) => getRestaurantApi()?.tables.assignOrder(d.tableId, d.orderId),
  ICloseTableCommand: (d) => getRestaurantApi()?.tables.clearOrder(d.tableId),

  // Payments
  IProcessPaymentCommand: (d) => getRestaurantApi()?.payments.process(d),
  IRefundPaymentCommand: (d) => getRestaurantApi()?.payments.refund(d.paymentId, d.amountCents, d.reason),
  IVoidPaymentCommand: (d) => getRestaurantApi()?.payments.void(d.paymentId, d.reason),

  // Kitchen
  ICreateKitchenTicketCommand: (d) => getRestaurantApi()?.kitchen.createTicket(d.orderId, d.priority),
  IUpdateTicketItemStatusCommand: (d) => getRestaurantApi()?.kitchen.updateItemStatus(d.itemId, d.status),
  ICompleteKitchenTicketCommand: (d) => getRestaurantApi()?.kitchen.completeTicket(d.ticketId),
  IMarkItemReadyCommand: (d) => getRestaurantApi()?.kitchen.markAllReady(d.ticketId),

  // Staff
  ICreateEmployeeCommand: (d) => getRestaurantApi()?.staff.create(d),
  IUpdateEmployeeCommand: (d) => getRestaurantApi()?.staff.update(d),
  IDeactivateEmployeeCommand: (d) => getRestaurantApi()?.staff.deactivate(d.employeeId, d.reason),
  IClockInCommand: (d) => getRestaurantApi()?.staff.clockIn(d),
  IClockOutCommand: (d) => getRestaurantApi()?.staff.clockOut(d),

  // Settings
  IUpdateSettingCommand: (d) => getRestaurantApi()?.settings.set(d.key, d.value),
  IBulkUpdateSettingsCommand: (d) => getRestaurantApi()?.settings.setBatch(d.settings ?? {}),
  IResetSettingCommand: (d) => getRestaurantApi()?.settings.delete(d.key),
};

/** Dispatch a command via IPC. Returns an application Result<T>. */
export async function dispatchCommandViaIpc<T>(commandType: string, command: unknown): Promise<Result<T>> {
  if (!hasIpc()) {
    return { isSuccess: false, value: null, error: 'IPC not available (not running in Electron)', errorCode: null, validationErrors: [], warnings: [], exception: null } as unknown as Result<T>;
  }
  const handler = COMMAND_IPC_MAP[commandType];
  if (!handler) {
    return { isSuccess: false, value: null, error: `No IPC handler mapped for command: ${commandType}`, errorCode: null, validationErrors: [], warnings: [], exception: null } as unknown as Result<T>;
  }
  try {
    const ipcResult: IpcApiResult<T> = await handler(command);
    return ipcToResult<T>(ipcResult);
  } catch (err: any) {
    return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err } as unknown as Result<T>;
  }
}

// ── Query Dispatch via IPC ──

const QUERY_IPC_MAP: Record<string, (data: any) => Promise<any>> = {
  // Orders
  IGetOrderQuery: (d) => getRestaurantApi()?.orders.get(d.orderId),
  IGetActiveOrdersQuery: () => getRestaurantApi()?.orders.listActive(),
  IGetOrdersByTableQuery: (d) => getRestaurantApi()?.orders.listByTable(d.tableId),
  IGetOrdersByStatusQuery: (d) => getRestaurantApi()?.orders.listByStatus(d.status),
  IGetOrdersByDateQuery: (d) => getRestaurantApi()?.orders.list({ startDate: d.startDate, endDate: d.endDate }),
  IGetUnpaidOrdersQuery: (d) => getRestaurantApi()?.orders.listByStatus(d.paymentStatus ?? 'unpaid'),

  // Products
  IGetProductQuery: (d) => getRestaurantApi()?.products.get(d.productId),
  IGetMenuQuery: (d) => d.categoryId
    ? getRestaurantApi()?.products.list({ categoryId: d.categoryId, limit: d.limit, offset: d.offset })
    : getRestaurantApi()?.products.listActive({ limit: d.limit, offset: d.offset }),
  ISearchProductsQuery: (d) => getRestaurantApi()?.products.search(d.query, d.limit),

  // Customers
  IGetCustomerQuery: (d) => getRestaurantApi()?.customers.get(d.customerId),
  ISearchCustomersQuery: (d) => getRestaurantApi()?.customers.search(d.query, d.limit),
  IGetTopCustomersQuery: (d) => getRestaurantApi()?.customers.getTop(d.metric, d.limit),
  IGetCustomerByEmailQuery: (d) => getRestaurantApi()?.customers.getByEmail(d.email),

  // Tables
  IGetTablesQuery: (d) => getRestaurantApi()?.tables.list(d),

  // Payments
  IGetPaymentsQuery: (d) => d.orderId
    ? getRestaurantApi()?.payments.listByOrder(d.orderId)
    : getRestaurantApi()?.payments.list(d),
  IGetPaymentSummaryQuery: (d) => getRestaurantApi()?.payments.totalsByMethod(d.startDate ?? '2000-01-01', d.endDate ?? '2099-12-31'),

  // Kitchen
  IGetKitchenQueueQuery: () => getRestaurantApi()?.kitchen.getQueue(),
  IGetActiveTicketsQuery: (d) => getRestaurantApi()?.kitchen.list(d),
  IGetTicketItemsQuery: (d) => getRestaurantApi()?.kitchen.getTicketItems(d.ticketId),

  // Staff
  IGetStaffQuery: (d) => getRestaurantApi()?.staff.list(d),
  IGetActiveShiftsQuery: () => getRestaurantApi()?.staff.getActiveShifts(),
  IGetShiftHistoryQuery: (d) => getRestaurantApi()?.staff.getShiftHistory(d.employeeId, d.startDate, d.endDate),

  // Settings
  IGetSettingQuery: (d) => getRestaurantApi()?.settings.get(d.key),
  IGetSettingsQuery: () => getRestaurantApi()?.settings.list(),

  // Reports
  IGetDashboardStatsQuery: () => getRestaurantApi()?.reports.dashboard(),
  IGetDailySummaryQuery: (d) => getRestaurantApi()?.reports.dailySummary(d.date),
  IGetSalesReportQuery: (d) => getRestaurantApi()?.reports.sales(d.startDate, d.endDate),
  IGetRevenueSummaryQuery: (d) => getRestaurantApi()?.reports.revenue(d.startDate, d.endDate),
  IGetTopSellingProductsQuery: (d) => getRestaurantApi()?.reports.topProducts(d.startDate, d.endDate, d.limit),
  IGetPaymentMethodBreakdownQuery: (d) => getRestaurantApi()?.reports.paymentMethods(d.startDate, d.endDate),
  IGetEmployeePerformanceQuery: (d) => getRestaurantApi()?.reports.staffPerformance(d.startDate, d.endDate),

  // Misc
  IGetCurrentUserQuery: () => Promise.resolve({ success: true, data: { id: 'user-1', email: 'operator@nexora.com', displayName: 'Operator', role: 'cashier' } }),
  IGetSyncStatusQuery: () => Promise.resolve({ success: true, data: { items: [{ status: 'offline' }], totalCount: 1 } }),
  IGetActiveCounterQuery: () => Promise.resolve({ success: true, data: { items: [], totalCount: 0 } }),
};

/** Dispatch a query via IPC. Returns an application Result<PaginatedResult<T>>. */
export async function dispatchQueryViaIpc<T>(queryType: string, query: unknown): Promise<Result<PaginatedResult<T>>> {
  if (!hasIpc()) {
    return { isSuccess: false, value: null, error: 'IPC not available', errorCode: null, validationErrors: [], warnings: [], exception: null } as unknown as Result<PaginatedResult<T>>;
  }
  const handler = QUERY_IPC_MAP[queryType];
  if (!handler) {
    return { isSuccess: false, value: null, error: `No IPC handler mapped for query: ${queryType}`, errorCode: null, validationErrors: [], warnings: [], exception: null } as unknown as Result<PaginatedResult<T>>;
  }
  try {
    const ipcResult: IpcApiResult<any> = await handler(query);

    // Handle single-item results (getById queries)
    if (ipcResult.success && ipcResult.data && !Array.isArray(ipcResult.data) && !ipcResult.data.items) {
      // Single item — wrap in paginated result
      const item = ipcResult.data;
      return {
        isSuccess: true,
        value: { items: item ? [item] : [], totalCount: item ? 1 : 0, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: item ? 1 : 0, executionTimeMs: 0 },
        error: null, errorCode: null, validationErrors: [], warnings: [], exception: null,
      } as unknown as Result<PaginatedResult<T>>;
    }

    return ipcToPaginatedResult<T>(ipcResult);
  } catch (err: any) {
    return { isSuccess: false, value: null, error: err.message, errorCode: null, validationErrors: [], warnings: [], exception: err } as unknown as Result<PaginatedResult<T>>;
  }
}

/** Check if IPC backend is available. */
export function isIpcAvailable(): boolean {
  return hasIpc();
}
