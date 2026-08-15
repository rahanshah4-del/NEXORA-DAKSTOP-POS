/**
 * IPaymentRepository — repository interface for Payments.
 * Interface only. No implementation.
 *
 * Note: Payments are currently embedded in Orders (paymentStatus, paymentMethod).
 * This repository represents the data layer for a future standalone payments table.
 */

import type { PaymentMethod, PaymentStatus } from '../types/enums';
import type { IRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Payment Record ──

export interface PaymentRecord {
  id: string;
  orderId: string;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  processedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Payment Repository Interface ──

export interface IPaymentRepository extends IRepository<PaymentRecord> {
  /** Find payments by order ID */
  findByOrder(orderId: string): Promise<PaymentRecord[]>;

  /** Find payments by method */
  findByMethod(method: PaymentMethod): Promise<PaymentRecord[]>;

  /** Find payments by status */
  findByStatus(status: PaymentStatus): Promise<PaymentRecord[]>;

  /** Find payments within a date range */
  findByDateRange(startDate: string, endDate: string, opts?: QueryOptions): Promise<PaymentRecord[]>;

  /** Get total payments by method within a date range */
  getTotalByMethod(startDate: string, endDate: string): Promise<Map<PaymentMethod, number>>;

  /** Refund a payment */
  refund(paymentId: string, reason?: string): Promise<PaymentRecord>;
}
