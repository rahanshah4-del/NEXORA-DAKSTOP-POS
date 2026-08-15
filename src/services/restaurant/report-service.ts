/**
 * ReportService — Restaurant analytics and reporting logic.
 *
 * Aggregates data across Order, Payment, Product, Staff, Customer, and Table repos.
 * Pure read-only — no mutations.
 */

import type { IOrderRepository } from '../../../repositories/IOrderRepository';
import type { IProductRepository } from '../../../repositories/IProductRepository';
import type { IPaymentRepository } from '../../../repositories/IPaymentRepository';
import type { IInventoryRepository } from '../../../repositories/IInventoryRepository';
import type { IStaffRepository } from '../../../repositories/IStaffRepository';
import type { ICustomerRepository } from '../../../repositories/ICustomerRepository';
import type { ITableRepository } from '../../../repositories/ITableRepository';
import type { PaymentMethod, OrderStatus } from '../../../types/enums';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

// ── Report DTOs ──

export interface SalesReport {
  period: string;
  totalOrders: number;
  totalRevenueCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
  averageOrderValueCents: number;
  ordersByStatus: Record<string, number>;
  revenueByHour: Record<number, number>;
}

export interface RevenueSummary {
  totalRevenueCents: number;
  totalTaxCents: number;
  totalTipsCents: number;
  netRevenueCents: number;
  orderCount: number;
  averageOrderCents: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenueCents: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  count: number;
  totalCents: number;
  percentage: number;
}

export interface StaffPerformance {
  employeeId: string;
  name: string;
  ordersServed: number;
  revenueCents: number;
  shiftCount: number;
  hoursWorked: number;
}

export interface DailySummary {
  date: string;
  totalOrders: number;
  totalRevenueCents: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderCents: number;
}

export interface DashboardStats {
  todayRevenueCents: number;
  todayOrderCount: number;
  activeOrders: number;
  occupiedTables: number;
  totalProducts: number;
  totalCustomers: number;
  staffOnDuty: number;
}

// ── Service ──

export class ReportService {
  constructor(
    private orderRepo: IOrderRepository,
    private productRepo: IProductRepository,
    private paymentRepo: IPaymentRepository,
    private inventoryRepo: IInventoryRepository,
    private staffRepo: IStaffRepository,
    private customerRepo: ICustomerRepository,
    private tableRepo: ITableRepository,
  ) {}

  // ── Sales Reports ──

  async getSalesReport(
    startDate: string,
    endDate: string,
  ): Promise<ServiceResult<SalesReport>> {
    const orders = await this.orderRepo.findByDateRange(startDate, endDate);

    const totalRevenue = orders.reduce((s, o) => s + (o.totalCents ?? 0), 0);
    const totalTax = orders.reduce((s, o) => s + (o.taxCents ?? 0), 0);
    const totalDiscount = orders.reduce((s, o) => s + (o.discountCents ?? 0), 0);

    const ordersByStatus: Record<string, number> = {};
    const revenueByHour: Record<number, number> = {};

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;

      const hour = new Date(order.createdAt).getHours();
      revenueByHour[hour] = (revenueByHour[hour] ?? 0) + (order.totalCents ?? 0);
    }

    return ok({
      period: `${startDate} — ${endDate}`,
      totalOrders: orders.length,
      totalRevenueCents: totalRevenue,
      totalTaxCents: totalTax,
      totalDiscountCents: totalDiscount,
      averageOrderValueCents: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
      ordersByStatus,
      revenueByHour,
    });
  }

  async getRevenueSummary(
    startDate: string,
    endDate: string,
  ): Promise<ServiceResult<RevenueSummary>> {
    const orders = await this.orderRepo.findByDateRange(startDate, endDate);
    const paid = orders.filter((o) => o.paymentStatus === 'paid');

    const revenue = paid.reduce((s, o) => s + (o.totalCents ?? 0), 0);
    const tax = paid.reduce((s, o) => s + (o.taxCents ?? 0), 0);
    const tips = 0; // Tips embedded in payments

    return ok({
      totalRevenueCents: revenue,
      totalTaxCents: tax,
      totalTipsCents: tips,
      netRevenueCents: revenue - tax,
      orderCount: paid.length,
      averageOrderCents: paid.length > 0 ? Math.round(revenue / paid.length) : 0,
    });
  }

  async getTopSellingProducts(
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<ServiceResult<TopProduct[]>> {
    const orders = await this.orderRepo.findByDateRange(startDate, endDate);
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of orders) {
      const items = await this.orderRepo.getItems(order.id);
      for (const item of items) {
        const entry = productMap.get(item.productId) ?? { name: item.name, quantity: 0, revenue: 0 };
        entry.quantity += item.quantity;
        entry.revenue += item.totalPriceCents;
        productMap.set(item.productId, entry);
      }
    }

    const sorted = Array.from(productMap.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, limit)
      .map(([id, data]) => ({
        productId: id,
        name: data.name,
        quantitySold: data.quantity,
        revenueCents: data.revenue,
      }));

    return ok(sorted);
  }

  async getPaymentMethodBreakdown(
    startDate: string,
    endDate: string,
  ): Promise<ServiceResult<PaymentBreakdown[]>> {
    const totals = await this.paymentRepo.getTotalByMethod(startDate, endDate);
    let grandTotal = 0;
    for (const [, total] of totals) {
      grandTotal += total;
    }

    const breakdown: PaymentBreakdown[] = [];
    for (const [method, total] of totals) {
      breakdown.push({
        method,
        count: 0,
        totalCents: total,
        percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
      });
    }

    return ok(breakdown);
  }

  async getStaffPerformance(
    startDate: string,
    endDate: string,
  ): Promise<ServiceResult<StaffPerformance[]>> {
    const employees = await this.staffRepo.findActive();

    const perf: StaffPerformance[] = [];
    for (const emp of employees) {
      const shifts = await this.staffRepo.getShiftsByDateRange(startDate, endDate);
      const empShifts = shifts.filter((s) => s.employeeId === emp.id);

      let ordersServed = 0;
      let revenue = 0;
      const allOrders = await this.orderRepo.findByDateRange(startDate, endDate);
      for (const order of allOrders) {
        if (order.createdBy === emp.id || order.createdBy === emp.userId) {
          ordersServed++;
          revenue += order.totalCents ?? 0;
        }
      }

      const hoursWorked = empShifts.reduce(
        (sum, s) => sum + (s.totalMinutes ?? 0) / 60,
        0,
      );

      perf.push({
        employeeId: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        ordersServed,
        revenueCents: revenue,
        shiftCount: empShifts.length,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
      });
    }

    return ok(perf.sort((a, b) => b.revenueCents - a.revenueCents));
  }

  async getDailySummary(date: string): Promise<ServiceResult<DailySummary>> {
    const orders = await this.orderRepo.findByDateRange(
      `${date} 00:00:00`,
      `${date} 23:59:59`,
    );

    const completed = orders.filter((o) => o.status === 'completed');
    const cancelled = orders.filter((o) => o.status === 'cancelled');
    const revenue = orders.reduce((s, o) => s + (o.totalCents ?? 0), 0);

    return ok({
      date,
      totalOrders: orders.length,
      totalRevenueCents: revenue,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      averageOrderCents: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
    });
  }

  async getDashboardStats(): Promise<ServiceResult<DashboardStats>> {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = await this.orderRepo.findByDateRange(
      `${today} 00:00:00`,
      `${today} 23:59:59`,
    );

    const activeOrders = todayOrders.filter(
      (o) => !['completed', 'cancelled'].includes(o.status),
    );

    const tables = await this.tableRepo.findAll();
    const occupiedTables = tables.filter((t) => t.status === 'occupied').length;

    const products = await this.productRepo.findAll();
    const customers = await this.customerRepo.findAll();
    const activeShifts = await this.staffRepo.getActiveShifts();

    const revenue = todayOrders.reduce((s, o) => s + (o.totalCents ?? 0), 0);

    return ok({
      todayRevenueCents: revenue,
      todayOrderCount: todayOrders.length,
      activeOrders: activeOrders.length,
      occupiedTables,
      totalProducts: products.length,
      totalCustomers: customers.length,
      staffOnDuty: activeShifts.length,
    });
  }

  /**
   * Export a report as JSON string.
   */
  async exportReport(type: string, data: unknown): Promise<string> {
    return JSON.stringify({ type, generatedAt: new Date().toISOString(), data }, null, 2);
  }
}
