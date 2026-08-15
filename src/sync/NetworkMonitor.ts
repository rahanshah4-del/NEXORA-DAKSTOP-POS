/**
 * NetworkMonitor — monitors network connectivity status.
 * Interface only. No implementation.
 */

import type { NetworkStatus, NetworkState } from './SyncTypes';

// ── Network Monitor Interface ──

export interface INetworkMonitor {
  /** Get the current network state */
  getState(): NetworkState;

  /** Check if currently online */
  isOnline(): boolean;

  /** Get current network status */
  getStatus(): NetworkStatus;

  /** Get the last measured latency in milliseconds */
  getLatency(): number | null;

  /** Start monitoring network changes */
  start(): void;

  /** Stop monitoring network changes */
  stop(): void;

  /** Register a callback for network status changes */
  onStatusChange(callback: (status: NetworkStatus) => void): () => void;

  /** Register a callback for when connectivity is restored */
  onReconnect(callback: () => void): () => void;

  /** Register a callback for when connectivity is lost */
  onDisconnect(callback: () => void): () => void;
}

// ── Network Event ──

export interface NetworkEvent {
  type: 'online' | 'offline' | 'degraded';
  timestamp: string;
  previousStatus: NetworkStatus;
  currentStatus: NetworkStatus;
}
