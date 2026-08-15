/**
 * PaymentCommandHandlers.ts — Command handlers for Payment-related commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { IPaymentRepository, PaymentRecord } from '../../repositories/IPaymentRepository';
import type { IOrderRepository } from '../../repositories/IOrderRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { PaymentMethod } from '../../types/enums';

export class PaymentCommandHandlers {
  constructor(
    private _paymentRepo: IPaymentRepository,
    private _orderRepo: IOrderRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async processPayment(command: any, ctx: IApplicationContext): Promise<Result<PaymentRecord>> {
    const order = await this._orderRepo.findById(command.orderId);
    if (!order) return Result.notFound('Order', command.orderId);

    if (order.paymentStatus === 'paid') {
      return Result.conflict('Order is already paid');
    }

    const payment = await this._paymentRepo.create({
      orderId: command.orderId,
      amountCents: command.amountCents ?? order.totalCents,
      method: (command.method ?? 'cash') as PaymentMethod,
      status: 'paid',
      reference: command.reference ?? null,
      notes: command.notes ?? null,
      processedBy: ctx.currentUser?.id ?? 'system',
    } as Partial<PaymentRecord>);

    // Update order payment status
    await this._orderRepo.updatePaymentStatus(command.orderId, 'paid');

    // Update customer stats
    if (order.customerId) {
      try {
        // Customer stats update would go here
      } catch { /* non-critical */ }
    }

    this._events.publish('payment.processed', {
      paymentId: payment.id,
      orderId: command.orderId,
      amountCents: payment.amountCents,
    });

    this._logger.info(`Payment processed: ${payment.amountCents} via ${payment.method}`, { paymentId: payment.id });
    return Result.ok(payment);
  }

  async refundPayment(command: any, ctx: IApplicationContext): Promise<Result<PaymentRecord>> {
    const payment = await this._paymentRepo.findById(command.paymentId);
    if (!payment) return Result.notFound('Payment', command.paymentId);

    if (payment.status === 'refunded') {
      return Result.conflict('Payment is already refunded');
    }

    const refunded = await this._paymentRepo.refund(command.paymentId, command.reason);
    await this._orderRepo.updatePaymentStatus(payment.orderId, 'refunded');

    this._events.publish('payment.refunded', {
      paymentId: command.paymentId,
      orderId: payment.orderId,
      amountCents: command.amountCents,
    });

    return Result.ok(refunded);
  }

  async voidPayment(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    const payment = await this._paymentRepo.findById(command.paymentId);
    if (!payment) return Result.notFound('Payment', command.paymentId);

    await this._paymentRepo.update(command.paymentId, { status: 'refunded' } as Partial<PaymentRecord>);
    this._events.publish('payment.voided', { paymentId: command.paymentId, reason: command.reason });
    return Result.success();
  }
}
