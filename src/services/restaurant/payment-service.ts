/**
 * PaymentService — Restaurant payment processing logic.
 *
 * Orchestrates: PaymentRepository, OrderRepository
 * Uses engines: TipCalculator
 */

import type { PaymentMethod, PaymentStatus } from '../../../types/enums';
import type { IPaymentRepository, PaymentRecord } from '../../../repositories/IPaymentRepository';
import type { IOrderRepository } from '../../../repositories/IOrderRepository';
import { TipCalculator } from './engines/tip-calculator';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors: [] };
}

// ── Types ──

export interface ProcessPaymentInput {
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string | null;
  tipCents?: number;
  processedBy: string;
}

export interface RefundPaymentInput {
  paymentId: string;
  amountCents?: number;
  reason?: string;
}

export interface PaymentSummary {
  totalCollectedCents: number;
  totalRefundedCents: number;
  netCents: number;
  byMethod: Record<string, number>;
  transactionCount: number;
}

// ── Service ──

export class PaymentService {
  private readonly tipCalculator = new TipCalculator();

  constructor(
    private paymentRepo: IPaymentRepository,
    private orderRepo: IOrderRepository,
  ) {}

  /**
   * Process a payment for an order.
   */
  async processPayment(input: ProcessPaymentInput): Promise<ServiceResult<PaymentRecord>> {
    const order = await this.orderRepo.findById(input.orderId);
    if (!order) return fail(`Order not found: ${input.orderId}`);

    if (order.paymentStatus === 'paid') {
      return fail('Order is already paid');
    }

    if (input.amountCents <= 0) {
      return fail('Payment amount must be positive');
    }

    // Validate amount doesn't exceed order total (with tolerance)
    if (input.amountCents > order.totalCents + 1000) {
      return fail(
        `Payment amount (${input.amountCents}) exceeds order total (${order.totalCents})`,
      );
    }

    const payment = await this.paymentRepo.create({
      orderId: input.orderId,
      amountCents: input.amountCents,
      method: input.method,
      status: 'paid' as PaymentStatus,
      reference: input.reference ?? null,
      notes: input.tipCents ? `Includes tip: ${input.tipCents} cents` : null,
      processedBy: input.processedBy,
    } as Partial<PaymentRecord>);

    // Update order
    await this.orderRepo.updatePaymentStatus(input.orderId, 'paid');

    // Update customer stats
    const order2 = await this.orderRepo.findById(input.orderId);
    // (customer stats update deferred to dedicated handler)

    return ok(payment);
  }

  /**
   * Process a full or partial refund.
   */
  async refundPayment(input: RefundPaymentInput): Promise<ServiceResult<PaymentRecord>> {
    const payment = await this.paymentRepo.findById(input.paymentId);
    if (!payment) return fail(`Payment not found: ${input.paymentId}`);

    if (payment.status === 'refunded') {
      return fail('Payment is already refunded');
    }

    const refundAmount = input.amountCents ?? payment.amountCents;

    if (refundAmount > payment.amountCents) {
      return fail('Refund amount exceeds original payment');
    }

    const refunded = await this.paymentRepo.refund(input.paymentId, input.reason);
    await this.orderRepo.updatePaymentStatus(payment.orderId, 'refunded');

    return ok(refunded);
  }

  /**
   * Void a payment (before settlement).
   */
  async voidPayment(paymentId: string, reason?: string): Promise<ServiceResult<void>> {
    const payment = await this.paymentRepo.findById(paymentId);
    if (!payment) return fail(`Payment not found: ${paymentId}`);

    await this.paymentRepo.update(paymentId, { status: 'refunded' } as Partial<PaymentRecord>);
    return ok(undefined);
  }

  // ── Queries ──

  async getPaymentsByOrder(orderId: string): Promise<PaymentRecord[]> {
    return this.paymentRepo.findByOrder(orderId);
  }

  async getPaymentsByMethod(method: PaymentMethod): Promise<PaymentRecord[]> {
    return this.paymentRepo.findByMethod(method);
  }

  async getPaymentsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<PaymentRecord[]> {
    return this.paymentRepo.findByDateRange(startDate, endDate);
  }

  async getTotalsByMethod(
    startDate: string,
    endDate: string,
  ): Promise<Map<PaymentMethod, number>> {
    return this.paymentRepo.getTotalByMethod(startDate, endDate);
  }

  async getPaymentSummary(
    startDate: string,
    endDate: string,
  ): Promise<PaymentSummary> {
    const payments = await this.paymentRepo.findByDateRange(startDate, endDate);

    let totalCollected = 0;
    let totalRefunded = 0;
    const byMethod: Record<string, number> = {};

    for (const p of payments) {
      if (p.status === 'refunded') {
        totalRefunded += p.amountCents;
      } else {
        totalCollected += p.amountCents;
        byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amountCents;
      }
    }

    return {
      totalCollectedCents: totalCollected,
      totalRefundedCents: totalRefunded,
      netCents: totalCollected - totalRefunded,
      byMethod,
      transactionCount: payments.length,
    };
  }

  /**
   * Calculate suggested tip amounts for an order.
   */
  getSuggestedTips(subtotalCents: number, percentages?: number[]) {
    return this.tipCalculator.getSuggestedTips(subtotalCents, percentages);
  }
}
