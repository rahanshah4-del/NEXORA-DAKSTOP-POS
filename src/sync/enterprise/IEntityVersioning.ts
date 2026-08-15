/**
 * IEntityVersioning — enterprise entity versioning interfaces.
 *
 * Every synchronized entity must support these fields for
 * multi-device, multi-branch conflict detection and resolution.
 *
 * Interface only. No implementation.
 */

import type { EntityType } from '../SyncTypes';

// ── Versioned Entity (extends all syncable entities) ──

export interface IVersionedEntity {
  /** Monotonically increasing version number for this entity */
  version: number;

  /** ISO-8601 timestamp of the last modification */
  lastModified: string;

  /** User ID who made the last modification */
  lastModifiedBy: string;

  /** Permanent device ID where the last modification originated */
  deviceId: string;

  /** Workspace ID that owns this entity */
  workspaceId: string;

  /** Branch ID that owns this entity */
  branchId: string;

  /** The sync protocol version used when this entity was last written */
  syncVersion: number;

  /** SHA-256 checksum of the entity payload for integrity verification */
  syncChecksum: string;

  /** ISO-8601 timestamp when the entity was soft-deleted, null if active */
  deletedAt: string | null;
}

// ── Versioned Entity Metadata (subset used during sync compare) ──

export interface IVersionedEntityMetadata {
  entityType: EntityType;
  entityId: string;
  version: number;
  lastModified: string;
  lastModifiedBy: string;
  deviceId: string;
  workspaceId: string;
  branchId: string;
  syncVersion: number;
  syncChecksum: string;
  deletedAt: string | null;
}

// ── Version Change Record ──

export interface IVersionChange {
  entityType: EntityType;
  entityId: string;
  fromVersion: number;
  toVersion: number;
  changedAt: string;
  changedBy: string;
  deviceId: string;
  changeType: 'create' | 'update' | 'delete' | 'restore';
}

// ── Sync Version Policy ──

export interface ISyncVersionPolicy {
  /** Current sync protocol version */
  readonly protocolVersion: number;

  /** Minimum supported protocol version for compatibility */
  readonly minSupportedVersion: number;

  /** Check if a remote version is compatible with the local version */
  isCompatible(remoteVersion: number): boolean;

  /** Get the next version number for an entity */
  nextVersion(currentVersion: number): number;

  /** Generate a checksum for an entity payload */
  generateChecksum(payload: Record<string, unknown>): string;

  /** Verify that a payload matches its checksum */
  verifyChecksum(payload: Record<string, unknown>, checksum: string): boolean;
}

// ── Entity Tombstone ──

export interface IEntityTombstone {
  entityType: EntityType;
  entityId: string;
  deletedAt: string;
  deletedBy: string;
  deviceId: string;
  workspaceId: string;
  branchId: string;
  version: number;
  syncChecksum: string;
}
