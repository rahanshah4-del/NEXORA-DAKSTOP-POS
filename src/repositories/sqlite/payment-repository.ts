/**
 * SQLitePaymentRepository — concrete SQLite implementation of IPaymentRepository.
 *
 * Manages the payments table.
 * Note: IPaymentRepository extends IRepository (not ISyncRepository), but we still
 * support soft delete and sync queueing per the global repository requirements.
 */

import type Database from 'better-sqlite3';
import type { PaymentMethod, PaymentStatus } from '../../types/enums';
import type { IPaymentRepository, PaymentRecord } from '../IPaymentRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, combineWhereClauses, notDeletedClause } from './utils';
import { enqueueSyncEntry } from './sync-queue';

interface PaymentRow {
  id: string;
  order_id: string;
  amount_cents: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  processed_by: string;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLitePaymentRepository
  extends BaseSqliteRepository<PaymentRecord>
  implements IPaymentRepository
{
  protected tableName = 'payments';
  protected entityType = 'payment' as const;

  protected toModel(row: Record<string, unknown>): PaymentRecord {
    const r = row as unknown as PaymentRow;
    return {
      id: r.id,
      orderId: r.order_id,
      amountCents: r.amount_cents,
      method: r.method as PaymentMethod,
      status: r.status as PaymentStatus,
      reference: r.reference,
      notes: r.notes,
      processedBy: r.processed_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<PaymentRecord>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.orderId !== undefined) db.order_id = data.orderId;
    if (data.amountCents !== undefined) db.amount_cents = data.amountCents;
    if (data.method !== undefined) db.method = data.method;
    if (data.status !== undefined) db.status = data.status;
    if (data.reference !== undefined) db.reference = data.reference;
    if (data.notes !== undefined) db.notes = data.notes;
    if (data.processedBy !== undefined) db.processed_by = data.processedBy;
    return db;
  }

  async findByOrder(orderId: string): Promise<PaymentRecord[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE order_id = ? AND ${notDeletedClause()} ORDER BY created_at DESC`,
      [orderId],
    );
  }

  async findByMethod(method: PaymentMethod): Promise<PaymentRecord[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE method = ? AND ${notDeletedClause()} ORDER BY created_at DESC`,
      [method],
    );
  }

  async findByStatus(status: PaymentStatus): Promise<PaymentRecord[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE status = ? AND ${notDeletedClause()} ORDER BY created_at DESC`,
      [status],
    );
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
    opts?: QueryOptions,
  ): Promise<PaymentRecord[]> {
    const { orderClause, limitClause, offsetClause, params: optParams } = buildQueryOptions(
      opts,
      'created_at DESC',
    );

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      `WHERE created_at >= ? AND created_at <= ? AND ${notDeletedClause()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, [startDate, endDate, ...optParams]);
  }

  async getTotalByMethod(startDate: string, endDate: string): Promise<Map<PaymentMethod, number>> {
    const rows = this.db
      .prepare(
        `SELECT method, SUM(amount_cents) AS total
         FROM ${this.tableName}
         WHERE created_at >= ? AND created_at <= ? AND ${notDeletedClause()}
         GROUP BY method`,
      )
      .all(startDate, endDate) as { method: string; total: number }[];

    const map = new Map<PaymentMethod, number>();
    for (const row of rows) {
      map.set(row.method as PaymentMethod, row.total ?? 0);
    }
    return map;
  }

  async refund(paymentId: string, reason?: string): Promise<PaymentRecord> {
    const original = await this.findById(paymentId);
    if (!original) throw new Error(`Payment not found: ${paymentId}`);

    // Mark original as refunded, then create a refund record
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runRefund = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE ${this.tableName} SET status = ?, updated_at = ?, version = version + 1 WHERE id = ?`,
        )
        .run('refunded', now, paymentId);

      enqueueSyncEntry(this.db, this.entityType, paymentId, 'update', {
        ...original,
        status: 'refunded',
        updatedAt: now,
      });

      return this.getOne(`SELECT * FROM ${this.tableName} WHERE id = ?`, [paymentId]);
    });

    const result = runRefund();
    if (!result) throw new Error(`Failed to refund payment: ${paymentId}`);
    return result;
  }
}
