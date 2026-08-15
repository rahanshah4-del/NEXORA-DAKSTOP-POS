/**
 * restaurant-ipc-types.ts — Typed IPC request/response map for all restaurant channels.
 *
 * Every channel has a strongly-typed request and response.
 * No `any` types — strict TypeScript generics throughout.
 *
 * Additive only — does NOT modify existing ipc-types.ts.
 */

import type { RESTAURANT_IPC_CHANNELS } from './restaurant-channels';
import type { Result } from '../application/common/Result';
import type { PaginatedResult } from '../application/common/IQueryHandler';
import type { Order, OrderItem, Product, Customer, Table, Employee, Shift, AppSetting } from '../types/models';
import type { PaymentRecord } from '../repositories/IPaymentRepository';
import type { KitchenTicket, KitchenTicketItem, KdsDisplayConfig } from '../repositories/IKitchenRepository';

// ── IPC Result Wrapper ──

/** All IPC responses wrap the application Result<T> for consistent error handling. */
export type IpcResult<T = void> = {
  success: boolean;
  data: T | null;
  error: string | null;
  validationErrors: Array<{ field: string; code: string; message: string }>;
};

/** All IPC list responses wrap PaginatedResult<T>. */
export type IpcListResult<T> = {
  success: boolean;
  data: {
    items: T[];
    totalCount: number;
    offset: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  } | null;
  error: string | null;
  validationErrors: Array<{ field: string; code: string; message: string }>;
};

// ── Helper: Convert App Result → IPC Result ──

export function toIpcResult<T>(result: Result<T>): IpcResult<T> {
  return {
    success: result.isSuccess,
    data: result.value,
    error: result.error,
    validationErrors: result.validationErrors.map((e) => ({
      field: e.field,
      code: e.code,
      message: e.message,
    })),
  };
}

export function toIpcListResult<T>(result: Result<PaginatedResult<T>>): IpcListResult<T> {
  return {
    success: result.isSuccess,
    data: result.value
      ? {
          items: result.value.items,
          totalCount: result.value.totalCount,
          offset: result.value.offset,
          limit: result.value.limit,
          hasNextPage: result.value.hasNextPage,
          hasPreviousPage: result.value.hasPreviousPage,
        }
      : null,
    error: result.error,
    validationErrors: result.validationErrors.map((e) => ({
      field: e.field,
      code: e.code,
      message: e.message,
    })),
  };
}

// ── Channel Type Map ──

export interface RestaurantIpcChannelMap {
  // Orders
  [RESTAURANT_IPC_CHANNELS.ORDERS_CREATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_CANCEL]: {
    request: { orderId: string; reason?: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_GET]: {
    request: { orderId: string };
    response: IpcResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_GET_WITH_ITEMS]: {
    request: { orderId: string };
    response: IpcResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_LIST]: {
    request: { limit?: number; offset?: number; status?: string };
    response: IpcListResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_LIST_ACTIVE]: {
    request: void;
    response: IpcListResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_TABLE]: {
    request: { tableId: string };
    response: IpcListResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_LIST_BY_STATUS]: {
    request: { status: string };
    response: IpcListResult<Order>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_ADD_ITEM]: {
    request: { orderId: string; productId: string; quantity: number; notes?: string };
    response: IpcResult<OrderItem>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_REMOVE_ITEM]: {
    request: { orderId: string; itemId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_STATUS]: {
    request: { orderId: string; status: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_UPDATE_PAYMENT]: {
    request: { orderId: string; paymentStatus: string; paymentMethod?: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.ORDERS_GET_NEXT_NUMBER]: {
    request: void;
    response: IpcResult<number>;
  };

  // Products
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_CREATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_DELETE]: {
    request: { productId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_GET]: {
    request: { productId: string };
    response: IpcResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST]: {
    request: { limit?: number; offset?: number; categoryId?: string };
    response: IpcListResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_LIST_ACTIVE]: {
    request: { limit?: number; offset?: number };
    response: IpcListResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_SEARCH]: {
    request: { query: string; limit?: number };
    response: IpcListResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_GET_BY_SKU]: {
    request: { sku: string };
    response: IpcResult<Product>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_UPDATE_PRICE]: {
    request: { productId: string; priceCents: number };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.PRODUCTS_BULK_UPDATE_PRICE]: {
    request: { productIds: string[]; priceAdjustmentPercent: number; reason?: string };
    response: IpcResult<Product[]>;
  };

  // Customers
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_CREATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_UPDATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_DELETE]: {
    request: { customerId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET]: {
    request: { customerId: string };
    response: IpcResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_LIST]: {
    request: { limit?: number; offset?: number };
    response: IpcListResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_SEARCH]: {
    request: { query: string; limit?: number };
    response: IpcListResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_BY_EMAIL]: {
    request: { email: string };
    response: IpcResult<Customer>;
  };
  [RESTAURANT_IPC_CHANNELS.CUSTOMERS_GET_TOP]: {
    request: { metric?: string; limit?: number };
    response: IpcListResult<Customer>;
  };

  // Tables
  [RESTAURANT_IPC_CHANNELS.TABLES_CREATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Table>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_UPDATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Table>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_DELETE]: {
    request: { tableId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_GET]: {
    request: { tableId: string };
    response: IpcResult<Table>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_LIST]: {
    request: { limit?: number; offset?: number; section?: string; status?: string };
    response: IpcListResult<Table>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_LIST_AVAILABLE]: {
    request: void;
    response: IpcListResult<Table>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_UPDATE_STATUS]: {
    request: { tableId: string; status: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_ALLOCATE]: {
    request: { partySize: number; preferredSection?: string };
    response: IpcResult<{ tableIds: string[]; totalCapacity: number }>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_ASSIGN_ORDER]: {
    request: { tableId: string; orderId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.TABLES_CLEAR_ORDER]: {
    request: { tableId: string };
    response: IpcResult<void>;
  };

  // Payments
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_PROCESS]: {
    request: { orderId: string; amountCents: number; method: string; reference?: string; processedBy: string };
    response: IpcResult<PaymentRecord>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_REFUND]: {
    request: { paymentId: string; amountCents?: number; reason?: string };
    response: IpcResult<PaymentRecord>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_VOID]: {
    request: { paymentId: string; reason?: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_GET]: {
    request: { paymentId: string };
    response: IpcResult<PaymentRecord>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST]: {
    request: { limit?: number; offset?: number; startDate?: string; endDate?: string };
    response: IpcListResult<PaymentRecord>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_LIST_BY_ORDER]: {
    request: { orderId: string };
    response: IpcListResult<PaymentRecord>;
  };
  [RESTAURANT_IPC_CHANNELS.PAYMENTS_TOTALS_BY_METHOD]: {
    request: { startDate: string; endDate: string };
    response: IpcResult<Record<string, number>>;
  };

  // Kitchen
  [RESTAURANT_IPC_CHANNELS.KITCHEN_CREATE_TICKET]: {
    request: { orderId: string; priority?: string };
    response: IpcResult<KitchenTicket>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_STATUS]: {
    request: { ticketId: string; status: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_COMPLETE_TICKET]: {
    request: { ticketId: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_UPDATE_ITEM_STATUS]: {
    request: { itemId: string; status: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_LIST]: {
    request: { limit?: number; offset?: number; status?: string };
    response: IpcListResult<KitchenTicket>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_GET_QUEUE]: {
    request: { displayId?: string };
    response: IpcListResult<KitchenTicket>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_GET_TICKET_ITEMS]: {
    request: { ticketId: string };
    response: IpcListResult<KitchenTicketItem>;
  };
  [RESTAURANT_IPC_CHANNELS.KITCHEN_MARK_ALL_READY]: {
    request: { ticketId: string };
    response: IpcResult<void>;
  };

  // Staff
  [RESTAURANT_IPC_CHANNELS.STAFF_CREATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Employee>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_UPDATE]: {
    request: Record<string, unknown>;
    response: IpcResult<Employee>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_DEACTIVATE]: {
    request: { employeeId: string; reason?: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_GET]: {
    request: { employeeId: string };
    response: IpcResult<Employee>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_LIST]: {
    request: { limit?: number; offset?: number; role?: string };
    response: IpcListResult<Employee>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_LIST_ACTIVE]: {
    request: void;
    response: IpcListResult<Employee>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_IN]: {
    request: { employeeId: string; notes?: string };
    response: IpcResult<Shift>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_CLOCK_OUT]: {
    request: { shiftId: string; notes?: string };
    response: IpcResult<Shift>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFT]: {
    request: { employeeId: string };
    response: IpcResult<Shift>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_GET_ACTIVE_SHIFTS]: {
    request: void;
    response: IpcListResult<Shift>;
  };
  [RESTAURANT_IPC_CHANNELS.STAFF_GET_SHIFT_HISTORY]: {
    request: { employeeId: string; startDate: string; endDate: string };
    response: IpcListResult<Shift>;
  };

  // Settings
  [RESTAURANT_IPC_CHANNELS.SETTINGS_GET]: {
    request: { key: string };
    response: IpcResult<string>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_SET]: {
    request: { key: string; value: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_SET_BATCH]: {
    request: { settings: Record<string, string> };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_DELETE]: {
    request: { key: string };
    response: IpcResult<void>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_LIST]: {
    request: void;
    response: IpcListResult<AppSetting>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_HAS_KEY]: {
    request: { key: string };
    response: IpcResult<boolean>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_EXPORT]: {
    request: void;
    response: IpcResult<string>;
  };
  [RESTAURANT_IPC_CHANNELS.SETTINGS_IMPORT]: {
    request: { json: string };
    response: IpcResult<void>;
  };

  // Reports
  [RESTAURANT_IPC_CHANNELS.REPORTS_SALES]: {
    request: { startDate: string; endDate: string };
    response: IpcListResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_REVENUE]: {
    request: { startDate: string; endDate: string };
    response: IpcResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_DASHBOARD]: {
    request: void;
    response: IpcResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_TOP_PRODUCTS]: {
    request: { startDate: string; endDate: string; limit?: number };
    response: IpcListResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_PAYMENT_METHODS]: {
    request: { startDate: string; endDate: string };
    response: IpcListResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_STAFF_PERFORMANCE]: {
    request: { startDate: string; endDate: string };
    response: IpcListResult<Record<string, unknown>>;
  };
  [RESTAURANT_IPC_CHANNELS.REPORTS_DAILY_SUMMARY]: {
    request: { date: string };
    response: IpcResult<Record<string, unknown>>;
  };
}

export type RestaurantIpcChannelName = keyof RestaurantIpcChannelMap;
