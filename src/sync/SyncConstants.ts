/**
 * SyncConstants — configuration constants for the sync architecture.
 * Values only. No implementation.
 */

import type { SyncConfig, RetryConfig } from './SyncTypes';

// ── Table Names ──

export const SYNC_TABLE_NAMES = {
  SYNC_QUEUE: 'sync_queue',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  INVENTORY_ITEMS: 'inventory_items',
  INVENTORY_TRANSACTIONS: 'inventory_transactions',
  PAYMENTS: 'payments',
  TABLES: 'tables',
  KITCHEN_TICKETS: 'kitchen_tickets',
  KITCHEN_TICKET_ITEMS: 'kitchen_ticket_items',
  EMPLOYEES: 'employees',
  SHIFTS: 'shifts',
  SETTINGS: 'settings',
} as const;

// ── Default Sync Configuration ──

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  syncIntervalMs: 30_000,           // 30 seconds
  batchSize: 50,
  maxRetries: 5,
  retryBaseDelayMs: 1_000,         // 1 second
  retryMaxDelayMs: 60_000,         // 60 seconds
  conflictStrategy: 'last-write-wins',
  entities: [
    'order',
    'customer',
    'product',
    'inventory',
    'payment',
    'table',
    'kitchen',
    'staff',
    'settings',
  ],
};

// ── Default Retry Configuration ──

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  backoffMultiplier: 2,
  jitter: true,
};

// ── Queue Limits ──

export const QUEUE_MAX_BATCH_SIZE = 100;
export const QUEUE_MAX_RETENTION_DAYS = 30;

// ── Network ──

export const NETWORK_PING_INTERVAL_MS = 15_000;    // 15 seconds
export const NETWORK_PING_TIMEOUT_MS = 5_000;       // 5 seconds
export const NETWORK_DEGRADED_LATENCY_MS = 1_000;   // 1 second threshold for degraded

// ── Sync Intervals ──

export const SYNC_INTERVAL_MS = 30_000;              // 30 seconds
export const SYNC_FAST_INTERVAL_MS = 10_000;         // 10 seconds (when online)
export const SYNC_SLOW_INTERVAL_MS = 120_000;        // 2 minutes (when idle)

// ── Lock Keys ──

export const SYNC_LOCK_KEY = 'sync_lock';
export const SYNC_LOCK_TTL_MS = 60_000;
