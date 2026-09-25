/**
 * useWorkspaceCurrency — the desktop's source of truth for currency.
 *
 * The web dashboard owns the setting: it lives on workspaces/{workspaceId} as
 * `currency` (ISO-4217) and an optional `currencySymbol` override. This module
 * subscribes to that document and resolves, in order:
 *
 *   1. the live workspace document (valid code only)
 *   2. the value cached in settings-store from the last successful read
 *   3. "PKR"
 *
 * Modelled on useMenuSync: the push handler is registered before the
 * subscription so the initial snapshot is never missed, and everything is torn
 * down on unmount or workspace change.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';

/** Used when neither the workspace document nor the cache yields a valid code. */
export const DEFAULT_CURRENCY = 'PKR';

const CURRENCY_CODE_RE = /^[A-Z]{3}$/;

/** Mirrors the main-process check, so a stale cache can't inject a bad code. */
function validCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim().toUpperCase();
  return CURRENCY_CODE_RE.test(code) ? code : null;
}

// ── Live slice ──
// Holds only what the listener has actually delivered. null means "nothing
// received yet", which is what makes the cache fallback distinguishable from a
// workspace that genuinely has no override.

interface WorkspaceCurrencyState {
  liveCode: string | null;
  liveSymbol: string | null;
  isResolved: boolean;
  setLive: (code: string | null, symbol: string) => void;
  reset: () => void;
}

const useWorkspaceCurrencyStore = create<WorkspaceCurrencyState>()((set) => ({
  liveCode: null,
  liveSymbol: null,
  isResolved: false,
  setLive: (code, symbol) => set({ liveCode: code, liveSymbol: symbol, isResolved: true }),
  reset: () => set({ liveCode: null, liveSymbol: null, isResolved: false }),
}));

export interface ResolvedWorkspaceCurrency {
  /** Always a valid ISO-4217 code. */
  currencyCode: string;
  /** Owner override, or "" to use the Intl default for the code. */
  currencySymbol: string;
  /** True once the workspace document has been read at least once. */
  isResolved: boolean;
}

/**
 * Read the resolved currency. Reactive against both the live listener and the
 * cached settings-store value, so consumers re-render when either changes.
 */
export function useWorkspaceCurrencyValue(): ResolvedWorkspaceCurrency {
  const liveCode = useWorkspaceCurrencyStore((s) => s.liveCode);
  const liveSymbol = useWorkspaceCurrencyStore((s) => s.liveSymbol);
  const isResolved = useWorkspaceCurrencyStore((s) => s.isResolved);
  const cachedCode = useSettingsStore((s) => s.currency);
  const cachedSymbol = useSettingsStore((s) => s.currencySymbol);

  return {
    currencyCode: liveCode ?? validCode(cachedCode) ?? DEFAULT_CURRENCY,
    // liveSymbol === '' is a real answer ("no override"), so only fall back
    // through to the cache while nothing has arrived at all.
    currencySymbol: liveSymbol ?? (typeof cachedSymbol === 'string' ? cachedSymbol : ''),
    isResolved,
  };
}

/** Non-reactive read, for code that runs outside React. */
export function getWorkspaceCurrencySnapshot(): ResolvedWorkspaceCurrency {
  const { liveCode, liveSymbol, isResolved } = useWorkspaceCurrencyStore.getState();
  const settings = useSettingsStore.getState();
  return {
    currencyCode: liveCode ?? validCode(settings.currency) ?? DEFAULT_CURRENCY,
    currencySymbol: liveSymbol ?? (typeof settings.currencySymbol === 'string' ? settings.currencySymbol : ''),
    isResolved,
  };
}

/**
 * Mount ONCE, at the app root, next to useMenuSync. Subscribing in more than
 * one place is harmless but pointless — the main process keeps a single
 * Firestore listener and replaces it on every re-subscribe.
 */
export function useWorkspaceCurrency(): void {
  const workspaceId = useAuthStore((s) => s.staffProfile?.workspaceId);

  useEffect(() => {
    // Logged out, or between sessions: drop the live value so the next
    // workspace can't briefly render the previous one's currency.
    if (!workspaceId || !window.api) {
      useWorkspaceCurrencyStore.getState().reset();
      return;
    }

    let cancelled = false;
    let unsubChanged: (() => void) | null = null;

    const apply = (payload: { currency: string | null; currencySymbol: string; exists: boolean }) => {
      if (cancelled) return;
      const code = validCode(payload.currency);
      const symbol = typeof payload.currencySymbol === 'string' ? payload.currencySymbol : '';

      useWorkspaceCurrencyStore.getState().setLive(code, symbol);

      // Warm the offline cache. Only a valid code is worth persisting; writing
      // is skipped when nothing changed so the store doesn't churn.
      if (!code) return;
      const settings = useSettingsStore.getState();
      if (settings.currency !== code || settings.currencySymbol !== symbol) {
        settings.update({ currency: code, currencySymbol: symbol });
      }
    };

    // Register the push-event handler BEFORE starting the subscription so the
    // initial snapshot emitted by onSnapshot is never missed.
    unsubChanged = window.api.firestore.workspace.onChanged((payload) => {
      if (payload?.workspaceId !== workspaceId) return;
      apply(payload);
    });

    window.api.firestore.workspace
      .subscribe(workspaceId)
      .catch((err: any) => {
        console.error('[useWorkspaceCurrency] Failed to subscribe to workspace:', err?.message ?? err);
      });

    return () => {
      cancelled = true;
      unsubChanged?.();
      window.api.firestore.workspace.unsubscribe().catch(() => {
        /* ignore — listener teardown is best-effort */
      });
    };
  }, [workspaceId]);
}
