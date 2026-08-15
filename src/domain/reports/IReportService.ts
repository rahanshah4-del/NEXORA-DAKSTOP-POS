/**
 * Reports Domain — Service, Validator, Policy, Factory.
 * Interface only. No implementation.
 */

export interface ISalesReport {
  date: string;
  totalOrders: number;
  totalRevenueCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
  averageOrderValueCents: number;
}

export interface IRevenueSummary {
  totalRevenueCents: number;
  totalTaxCents: number;
  totalTipsCents: number;
  totalDiscountsCents: number;
  totalRefundsCents: number;
  netRevenueCents: number;
}

export interface ITopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenueCents: number;
}

export interface IPaymentBreakdown {
  method: string;
  count: number;
  totalCents: number;
}

export interface IEmployeePerformance {
  employeeId: string;
  employeeName: string;
  ordersServed: number;
  totalRevenueCents: number;
  averageOrderValueCents: number;
  hoursWorked: number;
}

export interface ITableTurnover {
  tableId: string;
  tableName: string;
  partiesServed: number;
  averageDurationMinutes: number;
  totalRevenueCents: number;
}

export interface IDailySummary {
  date: string;
  orders: number;
  revenueCents: number;
  customers: number;
  newCustomers: number;
  reservations: number;
  averageWaitMinutes: number;
}

export interface IReportService {
  getSalesReport(startDate: string, endDate: string, groupBy: string): Promise<ISalesReport[]>;
  getRevenueSummary(startDate: string, endDate: string): Promise<IRevenueSummary>;
  getTopSellingProducts(startDate: string, endDate: string, limit: number): Promise<ITopProduct[]>;
  getPaymentMethodBreakdown(startDate: string, endDate: string): Promise<IPaymentBreakdown[]>;
  getEmployeePerformance(startDate: string, endDate: string): Promise<IEmployeePerformance[]>;
  getTableTurnover(startDate: string, endDate: string): Promise<ITableTurnover[]>;
  getDailySummary(date: string): Promise<IDailySummary>;
  getTaxReport(startDate: string, endDate: string): Promise<unknown>;
  getInventoryReport(startDate: string, endDate: string): Promise<unknown>;
  getStaffHoursReport(startDate: string, endDate: string, employeeId?: string): Promise<unknown>;
  getDashboardStats(): Promise<unknown>;
  exportReport(type: string, startDate: string, endDate: string, format: 'csv' | 'pdf' | 'json'): Promise<string>;
}

export interface IReportValidator {
  validateDateRange(startDate: string, endDate: string): import('../shared/IValidationResult').IValidationResult;
  validateReportType(type: string): import('../shared/IValidationResult').IValidationResult;
  validateExportFormat(format: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IReportPolicy {
  maxDateRangeDays(): number;
  isReportAvailable(type: string, userRole: string): boolean;
  requiresManagerApproval(type: string): boolean;
}
