/**
 * OrderService — Restaurant order business logic.
 *
 * Orchestrates: OrderRepository, TableRepository, CustomerRepository,
 *               ProductRepository, KitchenRepository
 * Uses engines: OrderCalculator, DiscountEngine, TaxCalculator
 *
 * Implements the IOrderService domain contract.
 */

import type { Order, OrderItem, Product } from '../../../types/models';
import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
} from '../../../types/enums';
import type { IOrderRepository } from '../../../repositories/IOrderRepository';
import type { ITableRepository } from '../../../repositories/ITableRepository';
import type { ICustomerRepository } from '../../../repositories/ICustomerRepository';
import type { IProductRepository } from '../../../repositories/IProductRepository';
import type { IKitchenRepository } from '../../../repositories/IKitchenRepository';
import { OrderCalculator } from './engines/order-calculator';
import { DiscountEngine } from './engines/discount-engine';
import { TaxCalculator } from './engines/tax-calculator';
import type { LineItemCalculation } from './engines/order-calculator';

// ── Result ──

export interface ServiceResult<T = void> {
  success: boolean;
  data: T | null;
  error: string | null;
  validationErrors: string[];
}

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string, validationErrors: string[] = []): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors };
}

// ── Command Types ──

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string | null;
  modifiers?: { modifierId: string }[];
}

export interface CreateOrderInput {
  tableId?: string | null;
  customerId?: string | null;
  orderType?: OrderType;
  items: CreateOrderItemInput[];
  notes?: string | null;
  createdBy: string;
}

export interface UpdateOrderInput {
  orderId: string;
  items?: CreateOrderItemInput[];
  notes?: string | null;
  customerId?: string | null;
}

// ── Service ──

export class OrderService {
  private readonly calculator = new OrderCalculator();
  private readonly discountEngine = new DiscountEngine();
  private readonly taxCalculator = new TaxCalculator();

  constructor(
    private orderRepo: IOrderRepository,
    private tableRepo: ITableRepository,
    private customerRepo: ICustomerRepository,
    private productRepo: IProductRepository,
    private kitchenRepo: IKitchenRepository,
  ) {}

  // ── Create Order ──

  async createOrder(input: CreateOrderInput): Promise<ServiceResult<Order>> {
    // Validate
    if (!input.items || input.items.length === 0) {
      return fail('Order must have at least one item', ['items']);
    }

    // Resolve table
    if (input.tableId) {
      const table = await this.tableRepo.findById(input.tableId);
      if (!table) return fail(`Table not found: ${input.tableId}`, ['tableId']);
      if (table.status === 'occupied') {
        return fail('Table is already occupied', ['tableId']);
      }
    }

    // Resolve products and calculate pricing
    const pricingInputs = [];
    for (const item of input.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) return fail(`Product not found: ${item.productId}`, ['items']);
      if (!product.isActive) return fail(`Product is inactive: ${product.name}`, ['items']);

      pricingInputs.push({
        productId: product.id,
        name: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
      });
    }

    const calc = this.calculator.calculate(pricingInputs);

    // Get next order number
    const orderNumber = await this.orderRepo.getNextOrderNumber();

    // Create order
    const order = await this.orderRepo.create({
      orderNumber,
      tableId: input.tableId ?? null,
      customerId: input.customerId ?? null,
      orderType: input.orderType ?? 'dine_in',
      status: 'pending' as OrderStatus,
      subtotalCents: calc.subtotalCents,
      taxCents: calc.taxCents,
      discountCents: calc.discountCents,
      totalCents: calc.totalCents,
      paymentStatus: 'unpaid' as PaymentStatus,
      paymentMethod: null,
      notes: input.notes ?? null,
      createdBy: input.createdBy,
    } as Partial<Order>);

    // Add items
    for (const item of input.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) continue;

      await this.orderRepo.addItem(order.id, {
        orderId: order.id,
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        totalPriceCents: product.priceCents * item.quantity,
        notes: item.notes ?? null,
        status: 'pending' as OrderStatus,
      });
    }

    // Update table status
    if (input.tableId) {
      await this.tableRepo.assignOrder(input.tableId, order.id);
      await this.tableRepo.updateStatus(input.tableId, 'occupied');
    }

    // Create kitchen ticket for dine-in
    if (input.orderType === 'dine_in' || !input.orderType) {
      try {
        await this.kitchenRepo.createTicket(order.id);
      } catch { /* non-critical */ }
    }

    const fullOrder = await this.orderRepo.findWithItems(order.id);
    return ok(fullOrder!);
  }

  // ── Update Order ──

  async updateOrder(input: UpdateOrderInput): Promise<ServiceResult<Order>> {
    const existing = await this.orderRepo.findById(input.orderId);
    if (!existing) return fail(`Order not found: ${input.orderId}`);

    if (existing.status === 'completed' || existing.status === 'cancelled') {
      return fail(`Cannot modify a ${existing.status} order`);
    }

    const updates: Partial<Order> = {};
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.customerId !== undefined) updates.customerId = input.customerId;

    // Recalculate if items changed
    if (input.items) {
      // Remove existing items
      const existingItems = await this.orderRepo.getItems(input.orderId);
      for (const ei of existingItems) {
        await this.orderRepo.removeItem(ei.id);
      }

      // Add new items
      let subtotal = 0;
      const pricingInputs = [];

      for (const item of input.items) {
        const product = await this.productRepo.findById(item.productId);
        if (!product) continue;

        const qty = item.quantity;
        const lineTotal = product.priceCents * qty;
        subtotal += lineTotal;
        pricingInputs.push({ productId: product.id, name: product.name, quantity: qty, unitPriceCents: product.priceCents });

        await this.orderRepo.addItem(input.orderId, {
          orderId: input.orderId,
          productId: item.productId,
          name: product.name,
          quantity: qty,
          unitPriceCents: product.priceCents,
          totalPriceCents: lineTotal,
          notes: item.notes ?? null,
          status: 'pending' as OrderStatus,
        });
      }

      updates.subtotalCents = subtotal;
      updates.taxCents = 0;
      updates.discountCents = 0;
      updates.totalCents = subtotal;
    }

    const updated = await this.orderRepo.update(input.orderId, updates);
    return ok(updated);
  }

  // ── Cancel Order ──

  async cancelOrder(orderId: string, reason?: string): Promise<ServiceResult<Order>> {
    const existing = await this.orderRepo.findById(orderId);
    if (!existing) return fail(`Order not found: ${orderId}`);

    if (existing.status === 'completed') {
      return fail('Cannot cancel a completed order');
    }

    const safeReason = (reason ?? '').trim();
    if (!safeReason) {
      return fail('A cancellation reason is required', ['reason']);
    }

    await this.orderRepo.cancelOrder(orderId, safeReason);

    // Release table
    if (existing.tableId) {
      await this.tableRepo.clearOrder(existing.tableId);
      await this.tableRepo.updateStatus(existing.tableId, 'available');
    }

    const updated = await this.orderRepo.findById(orderId);
    return ok(updated!);
  }

  // ── Add / Remove Items ──

  async addItem(
    orderId: string,
    productId: string,
    quantity: number,
    notes?: string,
  ): Promise<ServiceResult<OrderItem>> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) return fail(`Order not found: ${orderId}`);

    const product = await this.productRepo.findById(productId);
    if (!product) return fail(`Product not found: ${productId}`);

    const item = await this.orderRepo.addItem(orderId, {
      orderId,
      productId,
      name: product.name,
      quantity,
      unitPriceCents: product.priceCents,
      totalPriceCents: product.priceCents * quantity,
      notes: notes ?? null,
      status: 'pending' as OrderStatus,
    });

    // Recalculate order totals
    const items = await this.orderRepo.getItems(orderId);
    const subtotal = items.reduce((s, i) => s + i.totalPriceCents, 0);
    await this.orderRepo.update(orderId, {
      subtotalCents: subtotal,
      totalCents: subtotal + (order.taxCents ?? 0) - (order.discountCents ?? 0),
    } as Partial<Order>);

    return ok(item);
  }

  async removeItem(orderId: string, itemId: string): Promise<ServiceResult<void>> {
    await this.orderRepo.removeItem(itemId);

    // Recalculate
    const items = await this.orderRepo.getItems(orderId);
    const order = await this.orderRepo.findById(orderId);
    if (order) {
      const subtotal = items.reduce((s, i) => s + i.totalPriceCents, 0);
      await this.orderRepo.update(orderId, {
        subtotalCents: subtotal,
        totalCents: subtotal + (order.taxCents ?? 0) - (order.discountCents ?? 0),
      } as Partial<Order>);
    }

    return ok(undefined);
  }

  // ── Payment Status ──

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: PaymentMethod,
  ): Promise<ServiceResult<void>> {
    await this.orderRepo.updatePaymentStatus(orderId, paymentStatus);

    if (paymentMethod) {
      await this.orderRepo.update(orderId, { paymentMethod } as Partial<Order>);
    }

    return ok(undefined);
  }

  // ── Queries ──

  async getActiveOrders(): Promise<Order[]> {
    const all = await this.orderRepo.findAll({ limit: 500, orderBy: 'created_at', orderDir: 'DESC' });
    return all.filter((o) => !['completed', 'cancelled'].includes(o.status));
  }

  async getOrdersByTable(tableId: string): Promise<Order[]> {
    return this.orderRepo.findByTable(tableId);
  }

  async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderRepo.findByStatus(status);
  }

  async getOrdersByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    return this.orderRepo.findByDateRange(startDate, endDate);
  }

  async getOrderWithItems(orderId: string): Promise<Order | null> {
    return this.orderRepo.findWithItems(orderId);
  }

  async getNextOrderNumber(): Promise<number> {
    return this.orderRepo.getNextOrderNumber();
  }
}
