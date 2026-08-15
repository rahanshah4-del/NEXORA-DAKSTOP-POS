/**
 * IAudit — enterprise audit trail interfaces.
 *
 * Every mutating operation on synchronized entities must
 * produce an immutable audit record for compliance,
 * debugging, and reconciliation.
 *
 * Interface only. No implementation.
 */

import type { EntityType, SyncOperation } from '../SyncTypes';

// ── Audit Record ──

export interface IAuditRecord {
  /** Unique audit entry identifier */
  id: string;

  /** The entity type that was mutated */
  entityType: EntityType;

  /** The entity ID that was mutated */
  entityId: string;

  /** The operation performed */
  operation: AuditOperation;

  /** ISO-8601 timestamp of the mutation */
  timestamp: string;

  /** User ID who performed the operation */
  performedBy: string;

  /** User display name who performed the operation */
  performedByName: string | null;

  /** Device ID where the operation originated */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** The entity version after this operation */
  resultingVersion: number;

  /** JSON snapshot of the entity state after the operation */
  snapshot: string | null;

  /** JSON diff of the changes made */
  changes: string | null;

  /** Reason or note for the operation */
  reason: string | null;

  /** IP address of the originating device (if network-connected) */
  ipAddress: string | null;

  /** Sync session ID if this operation was part of a sync */
  syncSessionId: string | null;

  /** Whether this operation originated locally or was pulled remotely */
  origin: AuditOrigin;
}

export type AuditOperation = SyncOperation | 'restore' | 'export' | 'import' | 'archive' | 'merge';
export type AuditOrigin = 'local' | 'remote-sync' | 'system' | 'automated';

// ── Audit Filter ──

export interface IAuditFilter {
  entityType?: EntityType;
  entityId?: string;
  operation?: AuditOperation;
  performedBy?: string;
  deviceId?: string;
  workspaceId?: string;
  branchId?: string;
  origin?: AuditOrigin;
  since?: string;
  before?: string;
  limit?: number;
  offset?: number;
}

// ── Audit Summary ──

export interface IAuditSummary {
  totalRecords: number;
  byEntity: Map<EntityType, number>;
  byOperation: Map<AuditOperation, number>;
  byUser: Map<string, number>;
  byDevice: Map<string, number>;
  byOrigin: Map<AuditOrigin, number>;
  oldestRecordAt: string | null;
  newestRecordAt: string | null;
}

// ── Audit Provider Interface ──

export interface IAuditProvider {
  /** Record a new audit entry */
  record(entry: Omit<IAuditRecord, 'id' | 'timestamp'>): Promise<IAuditRecord>;

  /** Record multiple audit entries in a batch */
  recordBatch(entries: Array<Omit<IAuditRecord, 'id' | 'timestamp'>>): Promise<IAuditRecord[]>;

  /** Query audit records with filters */
  query(filter: IAuditFilter): Promise<IAuditRecord[]>;

  /** Get a single audit record by ID */
  getById(id: string): Promise<IAuditRecord | null>;

  /** Get all audit records for a specific entity */
  getEntityHistory(entityType: EntityType, entityId: string): Promise<IAuditRecord[]>;

  /** Get an audit summary */
  getSummary(filter?: Partial<IAuditFilter>): Promise<IAuditSummary>;

  /** Get the total count matching a filter */
  count(filter?: Partial<IAuditFilter>): Promise<number>;

  /** Prune audit records older than the retention period */
  prune(retentionDays: number): Promise<number>;

  /** Export audit records to JSON within a date range */
  exportToJson(startDate: string, endDate: string): Promise<string>;
}

// ── Audit Retention Policy ──

export interface IAuditRetentionPolicy {
  /** Default retention period in days */
  defaultRetentionDays: number;

  /** Per-entity-type retention overrides */
  entityOverrides: Partial<Record<EntityType, number>>;

  /** Whether to archive before pruning */
  archiveBeforePrune: boolean;

  /** Maximum records before forced pruning */
  maxRecords: number;
}
