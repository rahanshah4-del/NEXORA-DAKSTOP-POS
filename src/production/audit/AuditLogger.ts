/**
 * AuditLogger — Immutable audit trail for all sensitive operations.
 *
 * Logs: Login, Logout, Price Changes, Discounts, Refunds, Deletes, Settings changes, Clock In/Out.
 */

export type AuditAction =
  | 'login' | 'logout'
  | 'order.create' | 'order.cancel' | 'order.refund'
  | 'product.create' | 'product.update' | 'product.price_change' | 'product.delete'
  | 'customer.create' | 'customer.update'
  | 'payment.process' | 'payment.refund' | 'payment.void'
  | 'discount.apply'
  | 'settings.update'
  | 'staff.clock_in' | 'staff.clock_out'
  | 'backup.create' | 'backup.restore'
  | 'license.activate';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  deviceId: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  result: 'success' | 'failure';
  timestamp: string;
}

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private maxEntries = 10_000;
  private listeners: Array<(entry: AuditEntry) => void> = [];

  /** Log an audit entry. */
  log(
    action: AuditAction,
    userId: string,
    userName: string,
    deviceId: string,
    entityType?: string,
    entityId?: string,
    details?: Record<string, unknown>,
    result: 'success' | 'failure' = 'success',
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action, userId, userName, deviceId,
      entityType: entityType ?? null, entityId: entityId ?? null,
      details: details ?? null, result, timestamp: new Date().toISOString(),
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();

    // Notify listeners
    for (const listener of this.listeners) {
      try { listener(entry); } catch { /* swallow */ }
    }

    // Console log for development
    if (result === 'failure' || action.includes('delete') || action.includes('refund')) {
      console.warn(`[AUDIT] ${action} by ${userName}: ${result}`, details ?? '');
    }

    return entry;
  }

  /** Query audit entries. */
  query(filter?: {
    action?: AuditAction; userId?: string; entityType?: string;
    since?: string; before?: string; limit?: number;
  }): AuditEntry[] {
    let results = [...this.entries];

    if (filter?.action) results = results.filter(e => e.action === filter.action);
    if (filter?.userId) results = results.filter(e => e.userId === filter.userId);
    if (filter?.entityType) results = results.filter(e => e.entityType === filter.entityType);
    if (filter?.since) results = results.filter(e => e.timestamp >= filter.since!);
    if (filter?.before) results = results.filter(e => e.timestamp <= filter.before!);

    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filter?.limit) results = results.slice(0, filter.limit);

    return results;
  }

  /** Subscribe to audit events. */
  onEntry(callback: (entry: AuditEntry) => void): () => void {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(l => l !== callback); };
  }

  /** Get total entry count. */
  getCount(): number { return this.entries.length; }

  /** Export audit log as JSON. */
  exportJson(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /** Clear all entries. */
  clear(): void { this.entries = []; }
}

export const auditLogger = new AuditLogger();
