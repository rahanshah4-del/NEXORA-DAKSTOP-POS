/**
 * QueryCache — Smart in-memory cache with TTL, SWR, and entity-based invalidation.
 *
 * Features:
 *   - Configurable TTL per query type (default 30s)
 *   - Stale-while-revalidate (serve stale, refresh in background)
 *   - Automatic invalidation on related mutation events
 *   - Entity-based cache key grouping for targeted invalidation
 */

import { IPC_EVENTS, EVENT_SCREEN_MAP } from '../events/IpcEventBus';

// ── Types ──

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttlMs: number;
  queryType: string;
  params: string; // JSON.stringify'd params for cache key
  staleAt: number;
  expiresAt: number;
}

export interface CacheConfig {
  defaultTtlMs: number;
  staleWhileRevalidateMs: number;
  maxEntries: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTtlMs: 30_000,
  staleWhileRevalidateMs: 15_000,
  maxEntries: 500,
};

// ── Cache ──

export class QueryCache {
  private store = new Map<string, CacheEntry>();
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Build a cache key from query type + params. */
  private key(queryType: string, params?: unknown): string {
    return `${queryType}:${JSON.stringify(params ?? {})}`;
  }

  /** Get a cached entry. Returns null if miss or totally expired. */
  get<T>(queryType: string, params?: unknown): { data: T; stale: boolean } | null {
    const entry = this.store.get(this.key(queryType, params));
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(this.key(queryType, params));
      return null;
    }

    const stale = now > entry.staleAt;
    return { data: entry.data as T, stale };
  }

  /** Store data in cache. */
  set<T>(queryType: string, data: T, params?: unknown, ttlMs?: number): void {
    if (this.store.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    const now = Date.now();
    const ttl = ttlMs ?? this.config.defaultTtlMs;
    const entry: CacheEntry<T> = {
      data, timestamp: now, ttlMs: ttl,
      queryType, params: JSON.stringify(params ?? {}),
      staleAt: now + ttl - this.config.staleWhileRevalidateMs,
      expiresAt: now + ttl,
    };

    this.store.set(this.key(queryType, params), entry);
  }

  /** Invalidate ALL cached queries for affected screens when an event fires. */
  invalidateByEvent(eventType: string): string[] {
    const screens = EVENT_SCREEN_MAP[eventType] ?? [];
    const keysToDelete: string[] = [];

    // Also invalidate entity-specific queries
    for (const [key, entry] of this.store) {
      const shouldInvalidate = screens.some(s => entry.queryType.toLowerCase().includes(s));
      if (shouldInvalidate) keysToDelete.push(key);
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }

    return keysToDelete;
  }

  /** Invalidate all queries for a specific entity type. */
  invalidateByEntity(entityType: string): void {
    for (const [key, entry] of this.store) {
      if (entry.queryType.toLowerCase().includes(entityType.toLowerCase())) {
        this.store.delete(key);
      }
    }
  }

  /** Invalidate a specific query. */
  invalidate(queryType: string, params?: unknown): void {
    this.store.delete(this.key(queryType, params));
  }

  /** Clear all cache entries. */
  clear(): void {
    this.store.clear();
  }

  /** Get cache stats. */
  getStats(): { size: number; maxEntries: number; oldestEntryAge: number | null } {
    let oldest = Infinity;
    const now = Date.now();
    for (const entry of this.store.values()) {
      oldest = Math.min(oldest, now - entry.timestamp);
    }
    return {
      size: this.store.size,
      maxEntries: this.config.maxEntries,
      oldestEntryAge: oldest === Infinity ? null : Math.round(oldest / 1000),
    };
  }

  /** Evict the oldest entry. */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}

// ── Singleton ──

export const queryCache = new QueryCache();
