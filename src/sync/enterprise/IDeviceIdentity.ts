/**
 * IDeviceIdentity — permanent desktop device identity module.
 *
 * Generates and persists a unique device identifier for this
 * specific POS terminal installation. The device ID is used
 * for conflict detection, audit trails, and sync partitioning.
 *
 * Interface only. No implementation.
 */

// ── Device Identity ──

export interface IDeviceIdentity {
  /** Permanent unique device identifier (UUID v4) */
  readonly deviceId: string;

  /** Human-readable device name (e.g., "Front Counter Terminal") */
  readonly deviceName: string;

  /** Device type classification */
  readonly deviceType: DeviceType;

  /** Operating system information */
  readonly osInfo: IDeviceOsInfo;

  /** Application version installed */
  readonly appVersion: string;

  /** ISO-8601 timestamp when this device identity was created */
  readonly createdAt: string;

  /** ISO-8601 timestamp of the last identity verification */
  readonly lastVerifiedAt: string | null;

  /** Whether this device identity has been manually reset */
  readonly hasBeenReset: boolean;

  /** Number of times this device identity has been regenerated */
  readonly regenerationCount: number;
}

// ── Device Type ──

export type DeviceType =
  | 'pos-terminal'
  | 'kds-display'
  | 'tablet'
  | 'manager-workstation'
  | 'self-service-kiosk'
  | 'mobile-device';

// ── OS Info ──

export interface IDeviceOsInfo {
  platform: NodeJS.Platform;
  arch: string;
  release: string;
  hostname: string;
  cpuCores: number;
  totalMemoryBytes: number;
}

// ── Device Identity Provider Interface ──

export interface IDeviceIdentityProvider {
  /** Get the current device identity */
  getIdentity(): IDeviceIdentity;

  /** Initialize/generate the device identity (idempotent — only generates once) */
  initialize(deviceName?: string, deviceType?: DeviceType): Promise<IDeviceIdentity>;

  /** Verify the device identity integrity (checks local storage) */
  verify(): Promise<boolean>;

  /** Manually reset the device identity (generates a new UUID, increments counter) */
  reset(reason?: string): Promise<IDeviceIdentity>;

  /** Export the device identity for registration with a workspace */
  exportForRegistration(): IDeviceRegistrationPayload;

  /** Check if the device identity has been initialized */
  isInitialized(): boolean;
}

// ── Device Registration Payload (sent to server during enrollment) ──

export interface IDeviceRegistrationPayload {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  osInfo: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
  };
  appVersion: string;
  createdAt: string;
}

// ── Device Registration Status ──

export interface IDeviceRegistrationStatus {
  deviceId: string;
  registered: boolean;
  workspaceId: string | null;
  branchId: string | null;
  registeredAt: string | null;
  approvedBy: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
}

// ── Device Storage Interface ──

export interface IDeviceStorage {
  /** Persist the device identity to local secure storage */
  save(identity: IDeviceIdentity): Promise<void>;

  /** Load the device identity from local secure storage */
  load(): Promise<IDeviceIdentity | null>;

  /** Remove the device identity from local storage */
  remove(): Promise<void>;

  /** Check if a device identity exists in storage */
  exists(): Promise<boolean>;
}
