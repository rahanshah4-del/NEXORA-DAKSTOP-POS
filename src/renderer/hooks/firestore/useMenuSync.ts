/**
 * useMenuSync — subscribes to live Firestore menuItems changes and mirrors
 * them into the global menu store (the server-authoritative source of truth).
 *
 * Mounted once at the app-layout level, after the workspace/staff session is
 * established (ProtectedRoute guarantees staffProfile.workspaceId exists).
 * Unsubscribes cleanly on unmount / logout so no listener leaks across
 * sessions.
 */
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useMenuStore } from '@/stores/menu-store';
import { mapMenuItems, extractCategories } from '@/utils/menu-items';

export function useMenuSync(): void {
  const workspaceId = useAuthStore((s) => s.staffProfile?.workspaceId);

  useEffect(() => {
    if (!workspaceId || !window.api) return;

    let cancelled = false;
    let unsubChanged: (() => void) | null = null;

    const apply = (rawItems: Array<Record<string, unknown>>) => {
      if (cancelled) return;
      const items = mapMenuItems(rawItems);
      useMenuStore.getState().setItems(items);
      useMenuStore.getState().setCategories(extractCategories(items));
    };

    // Register the push-event handler BEFORE starting the subscription so the
    // initial snapshot emitted by onSnapshot is never missed.
    unsubChanged = window.api.firestore.menuItems.onChanged((payload) => {
      if (payload?.workspaceId !== workspaceId) return;
      apply((payload.items ?? []) as Array<Record<string, unknown>>);
    });

    window.api.firestore.menuItems
      .subscribe(workspaceId)
      .catch((err: any) => {
        console.error('[useMenuSync] Failed to subscribe to menuItems:', err?.message ?? err);
      });

    return () => {
      cancelled = true;
      unsubChanged?.();
      window.api.firestore.menuItems.unsubscribe().catch(() => {
        /* ignore — listener teardown is best-effort */
      });
    };
  }, [workspaceId]);
}
