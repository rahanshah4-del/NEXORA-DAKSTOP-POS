import { useState, useEffect } from 'react';

// ── Sync / Connectivity Status Hook (mirrors Header.tsx) ──

export interface SyncStatus {
  isOnline: boolean;
  /** null when the pending count could not be read. */
  pendingSync: number | null;
  stuckSync: number;
  /** null until (or unless) the app version is known. */
  appVersion: string | null;
}

/**
 * Extracted verbatim from pages/Dashboard.tsx — same 15s poll, same
 * `sync.onResult` subscription, same listeners and cleanup.
 */
export function useSyncStatus(): SyncStatus {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pendingSync, setPendingSync] = useState<number | null>(null);
  const [stuckSync, setStuckSync] = useState(0);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const pollSync = async () => {
      try {
        const count = window.api?.local?.sync?.pendingCount;
        if (typeof count !== 'function') return;
        const r = await count();
        if (cancelled) return;
        setPendingSync(Number((r as any)?.count) || 0);
        setStuckSync(Number((r as any)?.stuck) || 0);
      } catch {
        if (!cancelled) setPendingSync(null);
      }
    };
    pollSync();
    const syncTimer = setInterval(pollSync, 15_000);

    let unsub: (() => void) | undefined;
    try {
      if (window.api?.local?.sync?.onResult) {
        unsub = window.api.local.sync.onResult(() => {
          pollSync();
        });
      }
    } catch { /* non-critical */ }

    (async () => {
      try {
        const getVersion = window.api?.app?.getVersion;
        if (typeof getVersion !== 'function') return;
        const v = await getVersion();
        if (!cancelled && typeof v === 'string' && v.trim()) setAppVersion(v.trim());
      } catch { /* non-critical — version stays hidden */ }
    })();

    return () => {
      cancelled = true;
      clearInterval(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsub) unsub();
    };
  }, []);

  return { isOnline, pendingSync, stuckSync, appVersion };
}
