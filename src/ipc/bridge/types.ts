/**
 * bridge/types.ts — Shared IPC bridge type definitions.
 *
 * Used by both the preload script and the renderer's type declarations.
 * All types are plain JSON-serializable objects — no class instances.
 */

import type { Order, OrderItem, Product, Customer, Table, Employee, Shift, AppSetting } from '../../types/models';
import type { PaymentRecord } from '../../repositories/IPaymentRepository';
import type { KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';

// ── Result Types (JSON-safe versions of application Result) ──

export interface IpcResult<T = void> {
  success: boolean;
  data: T | null;
  error: string | null;
  validationErrors: IpcValidationError[];
}

export interface IpcValidationError {
  field: string;
  code: string;
  message: string;
}

export interface IpcListResult<T> {
  success: boolean;
  data: IpcPaginatedData<T> | null;
  error: string | null;
  validationErrors: IpcValidationError[];
}

export interface IpcPaginatedData<T> {
  items: T[];
  totalCount: number;
  offset: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ── Request Types ──

export interface OrderCreateRequest {
  tableId?: string | null;
  customerId?: string | null;
  orderType?: string;
  items: Array<{ productId: string; quantity: number; notes?: string | null }>;
  notes?: string | null;
  createdBy: string;
}

export interface PaymentProcessRequest {
  orderId: string;
  amountCents: number;
  method: string;
  reference?: string | null;
  tipCents?: number;
  processedBy: string;
}

export interface TableAllocateRequest {
  partySize: number;
  preferredSection?: string | null;
  allowMerge?: boolean;
}

export interface StaffClockInRequest {
  employeeId: string;
  notes?: string | null;
}

export interface StaffClockOutRequest {
  shiftId: string;
  notes?: string | null;
}

export interface ReportDateRangeRequest {
  startDate: string;
  endDate: string;
  limit?: number;
}

// ── API Surface Types ──

export interface RestaurantOrdersApi {
  create(data: OrderCreateRequest): Promise<IpcResult<Order>>;
  update(data: Record<string, unknown>): Promise<IpcResult<Order>>;
  cancel(orderId: string, reason?: string): Promise<IpcResult<void>>;
  get(orderId: string): Promise<IpcResult<Order>>;
  getWithItems(orderId: string): Promise<IpcResult<Order>>;
  list(opts?: { limit?: number; offset?: number; status?: string }): Promise<IpcListResult<Order>>;
  listActive(): Promise<IpcListResult<Order>>;
  listByTable(tableId: string): Promise<IpcListResult<Order>>;
  listByStatus(status: string): Promise<IpcListResult<Order>>;
  addItem(orderId: string, productId: string, quantity: number, notes?: string): Promise<IpcResult<OrderItem>>;
  removeItem(orderId: string, itemId: string): Promise<IpcResult<void>>;
  updateStatus(orderId: string, status: string): Promise<IpcResult<void>>;
  updatePayment(orderId: string, paymentStatus: string, paymentMethod?: string): Promise<IpcResult<void>>;
  getNextNumber(): Promise<IpcResult<number>>;
}

export interface RestaurantProductsApi {
  create(data: Record<string, unknown>): Promise<IpcResult<Product>>;
  update(data: Record<string, unknown>): Promise<IpcResult<Product>>;
  delete(productId: string): Promise<IpcResult<void>>;
  get(productId: string): Promise<IpcResult<Product>>;
  list(opts?: { limit?: number; offset?: number; categoryId?: string }): Promise<IpcListResult<Product>>;
  listActive(opts?: { limit?: number; offset?: number }): Promise<IpcListResult<Product>>;
  search(query: string, limit?: number): Promise<IpcListResult<Product>>;
  getBySku(sku: string): Promise<IpcResult<Product>>;
  updatePrice(productId: string, priceCents: number): Promise<IpcResult<void>>;
  bulkUpdatePrice(productIds: string[], priceAdjustmentPercent: number, reason?: string): Promise<IpcResult<Product[]>>;
}

export interface RestaurantCustomersApi {
  create(data: Record<string, unknown>): Promise<IpcResult<Customer>>;
  update(data: Record<string, unknown>): Promise<IpcResult<Customer>>;
  delete(customerId: string): Promise<IpcResult<void>>;
  get(customerId: string): Promise<IpcResult<Customer>>;
  list(opts?: { limit?: number; offset?: number }): Promise<IpcListResult<Customer>>;
  search(query: string, limit?: number): Promise<IpcListResult<Customer>>;
  getByEmail(email: string): Promise<IpcResult<Customer>>;
  getTop(metric?: string, limit?: number): Promise<IpcListResult<Customer>>;
}

export interface RestaurantTablesApi {
  create(data: Record<string, unknown>): Promise<IpcResult<Table>>;
  update(data: Record<string, unknown>): Promise<IpcResult<Table>>;
  delete(tableId: string): Promise<IpcResult<void>>;
  get(tableId: string): Promise<IpcResult<Table>>;
  list(opts?: { limit?: number; offset?: number }): Promise<IpcListResult<Table>>;
  listAvailable(): Promise<IpcListResult<Table>>;
  updateStatus(tableId: string, status: string): Promise<IpcResult<void>>;
  allocate(request: TableAllocateRequest): Promise<IpcResult<{ tableIds: string[]; totalCapacity: number }>>;
  assignOrder(tableId: string, orderId: string): Promise<IpcResult<void>>;
  clearOrder(tableId: string): Promise<IpcResult<void>>;
}

export interface RestaurantPaymentsApi {
  process(data: PaymentProcessRequest): Promise<IpcResult<PaymentRecord>>;
  refund(paymentId: string, amountCents?: number, reason?: string): Promise<IpcResult<PaymentRecord>>;
  void(paymentId: string, reason?: string): Promise<IpcResult<void>>;
  get(paymentId: string): Promise<IpcResult<PaymentRecord>>;
  list(opts?: { limit?: number; offset?: number; startDate?: string; endDate?: string }): Promise<IpcListResult<PaymentRecord>>;
  listByOrder(orderId: string): Promise<IpcListResult<PaymentRecord>>;
  totalsByMethod(startDate: string, endDate: string): Promise<IpcResult<Record<string, number>>>;
}

export interface RestaurantKitchenApi {
  createTicket(orderId: string, priority?: string): Promise<IpcResult<KitchenTicket>>;
  updateStatus(ticketId: string, status: string): Promise<IpcResult<void>>;
  completeTicket(ticketId: string): Promise<IpcResult<void>>;
  updateItemStatus(itemId: string, status: string): Promise<IpcResult<void>>;
  list(opts?: { limit?: number; offset?: number }): Promise<IpcListResult<KitchenTicket>>;
  getQueue(displayId?: string): Promise<IpcListResult<KitchenTicket>>;
  getTicketItems(ticketId: string): Promise<IpcListResult<KitchenTicketItem>>;
  markAllReady(ticketId: string): Promise<IpcResult<void>>;
}

export interface RestaurantStaffApi {
  create(data: Record<string, unknown>): Promise<IpcResult<Employee>>;
  update(data: Record<string, unknown>): Promise<IpcResult<Employee>>;
  deactivate(employeeId: string, reason?: string): Promise<IpcResult<void>>;
  get(employeeId: string): Promise<IpcResult<Employee>>;
  list(opts?: { limit?: number; offset?: number; role?: string }): Promise<IpcListResult<Employee>>;
  listActive(): Promise<IpcListResult<Employee>>;
  clockIn(data: StaffClockInRequest): Promise<IpcResult<Shift>>;
  clockOut(data: StaffClockOutRequest): Promise<IpcResult<Shift>>;
  getActiveShift(employeeId: string): Promise<IpcResult<Shift>>;
  getActiveShifts(): Promise<IpcListResult<Shift>>;
  getShiftHistory(employeeId: string, startDate: string, endDate: string): Promise<IpcListResult<Shift>>;
}

export interface RestaurantSettingsApi {
  get(key: string): Promise<IpcResult<string>>;
  set(key: string, value: string): Promise<IpcResult<void>>;
  setBatch(settings: Record<string, string>): Promise<IpcResult<void>>;
  delete(key: string): Promise<IpcResult<void>>;
  list(): Promise<IpcListResult<AppSetting>>;
  hasKey(key: string): Promise<IpcResult<boolean>>;
  exportJson(): Promise<IpcResult<string>>;
  importJson(json: string): Promise<IpcResult<void>>;
}

export interface RestaurantReportsApi {
  sales(startDate: string, endDate: string): Promise<IpcListResult<Record<string, unknown>>>;
  revenue(startDate: string, endDate: string): Promise<IpcResult<Record<string, unknown>>>;
  dashboard(): Promise<IpcResult<Record<string, unknown>>>;
  topProducts(startDate: string, endDate: string, limit?: number): Promise<IpcListResult<Record<string, unknown>>>;
  paymentMethods(startDate: string, endDate: string): Promise<IpcListResult<Record<string, unknown>>>;
  staffPerformance(startDate: string, endDate: string): Promise<IpcListResult<Record<string, unknown>>>;
  dailySummary(date: string): Promise<IpcResult<Record<string, unknown>>>;
}

// ── Top-Level Restaurant API ──

export interface RestaurantApi {
  orders: RestaurantOrdersApi;
  products: RestaurantProductsApi;
  customers: RestaurantCustomersApi;
  tables: RestaurantTablesApi;
  payments: RestaurantPaymentsApi;
  kitchen: RestaurantKitchenApi;
  staff: RestaurantStaffApi;
  settings: RestaurantSettingsApi;
  reports: RestaurantReportsApi;
}
