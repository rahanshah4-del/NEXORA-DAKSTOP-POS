/**
 * OrderViewModel.ts — Transforms Order domain models to UI-friendly shapes.
 *
 * All amounts are in dollars (not cents). Dates are formatted for display.
 */

import type { Order, OrderItem } from '../../types/models';
import type { OrderStatus, PaymentStatus, OrderType } from '../../types/enums';

// ── UI Types ──

export interface OrderViewData {
  id: string;
  orderNumber: number;
  tableName: string;
  customerName: string;
  orderType: string;
  status: string;
  statusLabel: string;
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
  items: OrderItemViewData[];
  notes: string;
  createdAt: string;
  createdAtFormatted: string;
  canModify: boolean;
  canCancel: boolean;
  statusColor: 'blue' | 'yellow' | 'green' | 'red' | 'gray';
}

export interface OrderItemViewData {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes: string;
  status: string;
}

// ── Status Labels ──

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, OrderViewData['statusColor']> = {
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'blue',
  ready: 'green',
  served: 'green',
  completed: 'gray',
  cancelled: 'red',
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
  refunded: 'Refunded',
};

// ── Mapper ──

export class OrderViewModel {
  /** Convert cents to dollar string (e.g., 1499 → "$14.99"). */
  static centsToDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /** Format an ISO date string for display. */
  static formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  /** Map a domain Order to UI-friendly OrderViewData. */
  static toViewData(order: Order): OrderViewData {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      tableName: order.tableName ?? '—',
      customerName: order.customerName ?? 'Walk-in',
      orderType: order.orderType,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status] ?? order.status,
      subtotal: this.centsToDollars(order.subtotalCents),
      tax: this.centsToDollars(order.taxCents),
      discount: this.centsToDollars(order.discountCents),
      total: this.centsToDollars(order.totalCents),
      paymentStatus: PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus,
      paymentMethod: order.paymentMethod ?? '—',
      itemCount: order.items?.length ?? 0,
      items: (order.items ?? []).map(this.itemToViewData),
      notes: order.notes ?? '',
      createdAt: order.createdAt,
      createdAtFormatted: this.formatDate(order.createdAt),
      canModify: !['completed', 'cancelled'].includes(order.status),
      canCancel: !['completed', 'cancelled'].includes(order.status),
      statusColor: STATUS_COLORS[order.status] ?? 'gray',
    };
  }

  /** Map a domain OrderItem to UI-friendly shape. */
  static itemToViewData(item: OrderItem): OrderItemViewData {
    return {
      id: item.id,
      productName: item.name,
      quantity: item.quantity,
      unitPrice: this.centsToDollars(item.unitPriceCents),
      totalPrice: this.centsToDollars(item.totalPriceCents),
      notes: item.notes ?? '',
      status: item.status,
    };
  }

  /** Map an array of orders. */
  static toViewDataList(orders: Order[]): OrderViewData[] {
    return orders.map((o) => this.toViewData(o));
  }

  /** Get status badge color. */
  static statusColor(status: string): string {
    return STATUS_COLORS[status] ?? 'gray';
  }

  /** Get human-readable status label. */
  static statusLabel(status: string): string {
    return STATUS_LABELS[status] ?? status;
  }
}
