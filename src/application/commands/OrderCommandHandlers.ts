/**
 * OrderCommandHandlers.ts — Command handlers for all Order-related commands.
 *
 * Each method accepts a domain command + context and returns Result<T>.
 * Orchestrates repositories, validates business rules, publishes events.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result, ErrorCode } from '../common/Result';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { ITableRepository } from '../../repositories/ITableRepository';
import type { ICustomerRepository } from '../../repositories/ICustomerRepository';
import type { IProductRepository } from '../../repositories/IProductRepository';
import type { IInventoryRepository } from '../../repositories/IInventoryRepository';
import type { IKitchenRepository } from '../../repositories/IKitchenRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { Order, OrderItem } from '../../types/models';
import type { OrderStatus, PaymentStatus, PaymentMethod, OrderType } from '../../types/enums';

export class OrderCommandHandlers {
  constructor(
    private _orderRepo: IOrderRepository,
    private _tableRepo: ITableRepository,
    private _customerRepo: ICustomerRepository,
    private _productRepo: IProductRepository,
    private _inventoryRepo: IInventoryRepository,
    private _kitchenRepo: IKitchenRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  // ── Create Order ──

  async createOrder(command: any, ctx: IApplicationContext): Promise<Result<Order>> {
    const nextNumber = await this._orderRepo.getNextOrderNumber();

    // Validate table
    if (command.tableId) {
      const table = await this._tableRepo.findById(command.tableId);
      if (!table) return Result.validationFail([{ field: 'tableId', code: 'NOT_FOUND', message: 'Table not found' }]);
      if (table.status === 'occupied') return Result.conflict('Table is already occupied');
    }

    // Calculate totals from items
    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    if (command.items && Array.isArray(command.items)) {
      for (const item of command.items) {
        const product = await this._productRepo.findById(item.productId);
        if (!product) return Result.validationFail([{ field: 'productId', code: 'NOT_FOUND', message: `Product not found: ${item.productId}` }]);
        if (!product.isActive) return Result.validationFail([{ field: 'productId', code: 'INACTIVE', message: `Product is inactive: ${product.name}` }]);

        const qty = item.quantity ?? 1;
        const lineTotal = product.priceCents * qty;
        subtotal += lineTotal;

        orderItems.push({
          productId: item.productId,
          name: product.name,
          quantity: qty,
          unitPriceCents: product.priceCents,
          totalPriceCents: lineTotal,
          notes: item.notes ?? null,
          status: 'pending' as OrderStatus,
        });
      }
    }

    const taxCents = Math.round(subtotal * 0); // Tax calculation belongs in domain service
    const discountCents = 0;
    const totalCents = subtotal + taxCents - discountCents;

    const order = await this._orderRepo.create({
      orderNumber: nextNumber,
      tableId: command.tableId ?? null,
      customerId: command.customerId ?? null,
      orderType: (command.orderType ?? 'dine_in') as OrderType,
      status: 'pending' as OrderStatus,
      subtotalCents: subtotal,
      taxCents,
      discountCents,
      totalCents,
      paymentStatus: 'unpaid' as PaymentStatus,
      paymentMethod: null,
      notes: command.notes ?? null,
      createdBy: ctx.currentUser?.id ?? 'system',
    } as Partial<Order>);

    // Add items
    for (const item of orderItems) {
      await this._orderRepo.addItem(order.id, { ...item, orderId: order.id });
    }

    // Update table status
    if (command.tableId) {
      await this._tableRepo.update(command.tableId, { status: 'occupied', currentOrderId: order.id } as any);
    }

    // Create kitchen ticket for dine-in orders
    if (command.orderType === 'dine_in' || !command.orderType) {
      try {
        await this._kitchenRepo.createTicket(order.id);
      } catch { /* non-critical */ }
    }

    const fullOrder = await this._orderRepo.findWithItems(order.id);
    this._events.publish('order.created', { orderId: order.id, orderNumber: nextNumber });
    this._logger.info(`Order #${nextNumber} created`, { orderId: order.id });

    return Result.ok(fullOrder!);
  }

  // ── Update Order ──

  async updateOrder(command: any, ctx: IApplicationContext): Promise<Result<Order>> {
    const existing = await this._orderRepo.findById(command.orderId);
    if (!existing) return Result.notFound('Order', command.orderId);

    const updates: Partial<Order> = {};
    if (command.notes !== undefined) updates.notes = command.notes;
    if (command.customerId !== undefined) updates.customerId = command.customerId;

    // Update items if provided
    if (command.items && Array.isArray(command.items)) {
      const currentItems = await this._orderRepo.getItems(command.orderId);

      // Remove items not in the update
      const updatedIds = new Set(command.items.filter((i: any) => i.itemId).map((i: any) => i.itemId));
      for (const ci of currentItems) {
        if (!updatedIds.has(ci.id)) {
          await this._orderRepo.removeItem(ci.id);
        }
      }

      // Add/update items
      let subtotal = 0;
      for (const item of command.items) {
        const product = await this._productRepo.findById(item.productId);
        if (!product) continue;

        const qty = item.quantity ?? 1;
        const lineTotal = product.priceCents * qty;
        subtotal += lineTotal;

        if (item.itemId) {
          await this._orderRepo.updateItem(item.itemId, {
            productId: item.productId,
            name: product.name,
            quantity: qty,
            unitPriceCents: product.priceCents,
            totalPriceCents: lineTotal,
            notes: item.notes,
          });
        } else {
          await this._orderRepo.addItem(command.orderId, {
            productId: item.productId,
            name: product.name,
            quantity: qty,
            unitPriceCents: product.priceCents,
            totalPriceCents: lineTotal,
            notes: item.notes,
          });
        }
      }

      updates.subtotalCents = subtotal;
      updates.totalCents = subtotal + (existing.taxCents ?? 0) - (existing.discountCents ?? 0);
    }

    const updated = await this._orderRepo.update(command.orderId, updates);
    this._events.publish('order.updated', { orderId: command.orderId });
    return Result.ok(updated);
  }

  // ── Cancel Order ──

  async cancelOrder(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const existing = await this._orderRepo.findById(command.orderId);
    if (!existing) return Result.notFound('Order', command.orderId);

    if (existing.status === 'completed') {
      return Result.businessRuleViolation('Cannot cancel a completed order');
    }

    // Require a non-empty reason
    const reason = (command.reason ?? '').trim();
    if (!reason) {
      return Result.validationFail([{ field: 'reason', code: 'REQUIRED', message: 'A cancellation reason is required' }]);
    }

    await this._orderRepo.cancelOrder(command.orderId, reason);

    // Free the table
    if (existing.tableId) {
      await this._tableRepo.clearOrder(existing.tableId);
      await this._tableRepo.updateStatus(existing.tableId, 'available');
    }

    this._events.publish('order.cancelled', { orderId: command.orderId, reason });
    return Result.success();
  }

  // ── Refund Order ──

  async refundOrder(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const existing = await this._orderRepo.findById(command.orderId);
    if (!existing) return Result.notFound('Order', command.orderId);

    if (existing.paymentStatus !== 'paid') {
      return Result.businessRuleViolation('Can only refund paid orders');
    }

    await this._orderRepo.updatePaymentStatus(command.orderId, 'refunded');
    this._events.publish('order.refunded', { orderId: command.orderId, amountCents: command.amountCents });
    return Result.success();
  }

  // ── Split Bill ──

  async splitBill(command: any, ctx: IApplicationContext): Promise<Result<Order[]>> {
    const existing = await this._orderRepo.findById(command.orderId);
    if (!existing) return Result.notFound('Order', command.orderId);

    const items = await this._orderRepo.getItems(command.orderId);
    const newOrders: Order[] = [];

    for (const split of command.splits ?? []) {
      const splitItems = items.filter((i) => split.items?.includes(i.id));
      if (splitItems.length === 0) continue;

      const subtotal = splitItems.reduce((sum, i) => sum + i.totalPriceCents, 0);
      const nextNumber = await this._orderRepo.getNextOrderNumber();

      const newOrder = await this._orderRepo.create({
        orderNumber: nextNumber,
        tableId: existing.tableId,
        customerId: split.customerId ?? existing.customerId,
        orderType: existing.orderType,
        status: 'pending',
        subtotalCents: subtotal,
        totalCents: subtotal,
        paymentStatus: 'unpaid',
        notes: split.notes,
        createdBy: ctx.currentUser?.id ?? 'system',
      } as Partial<Order>);

      for (const item of splitItems) {
        await this._orderRepo.addItem(newOrder.id, { ...item, id: undefined, orderId: newOrder.id });
        await this._orderRepo.removeItem(item.id);
      }

      newOrders.push(newOrder);
    }

    this._events.publish('order.billSplit', { originalOrderId: command.orderId, newOrderIds: newOrders.map(o => o.id) });
    return Result.ok(newOrders);
  }

  // ── Update Order Status ──

  async updateOrderStatus(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const existing = await this._orderRepo.findById(command.orderId);
    if (!existing) return Result.notFound('Order', command.orderId);

    await this._orderRepo.updateStatus(command.orderId, command.status);
    this._events.publish('order.statusChanged', { orderId: command.orderId, status: command.status });
    return Result.success();
  }

  // ── Add / Remove Item ──

  async addOrderItem(command: any, ctx: IApplicationContext): Promise<Result<OrderItem>> {
    const product = await this._productRepo.findById(command.productId);
    if (!product) return Result.notFound('Product', command.productId);

    const item = await this._orderRepo.addItem(command.orderId, {
      productId: command.productId,
      name: product.name,
      quantity: command.quantity ?? 1,
      unitPriceCents: product.priceCents,
      totalPriceCents: product.priceCents * (command.quantity ?? 1),
      notes: command.notes ?? null,
    });

    this._events.publish('order.itemAdded', { orderId: command.orderId, itemId: item.id });
    return Result.ok(item);
  }

  async removeOrderItem(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._orderRepo.removeItem(command.itemId);
    this._events.publish('order.itemRemoved', { orderId: command.orderId, itemId: command.itemId });
    return Result.success();
  }

  // ── Update Payment Status ──

  async updatePaymentStatus(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._orderRepo.updatePaymentStatus(command.orderId, command.paymentStatus);

    if (command.paymentStatus === 'paid' && command.paymentMethod) {
      await this._orderRepo.update(command.orderId, { paymentMethod: command.paymentMethod } as any);
    }

    this._events.publish('order.paymentStatusChanged', { orderId: command.orderId, paymentStatus: command.paymentStatus });
    return Result.success();
  }

  // ── Merge Table ──

  async mergeTable(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const sourceOrders = await this._orderRepo.findByTable(command.sourceTableId);
    for (const order of sourceOrders) {
      await this._orderRepo.update(order.id, { tableId: command.targetTableId } as any);
    }
    await this._tableRepo.clearOrder(command.sourceTableId);
    await this._tableRepo.updateStatus(command.sourceTableId, 'available');
    this._events.publish('table.merged', { sourceTableId: command.sourceTableId, targetTableId: command.targetTableId });
    return Result.success();
  }

  // ── Assign Waiter ──

  async assignWaiter(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._tableRepo.update(command.tableId, { currentOrderId: command.waiterId } as any);
    return Result.success();
  }
}
