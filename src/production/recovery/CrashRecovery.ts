/**
 * CrashRecovery — Session and cart state recovery after unexpected termination.
 *
 * Persists: unsaved cart, pending order, pending payment, current session, last screen.
 * Restores automatically on next launch.
 */

export interface RecoveryState {
  unsavedCart: unknown | null;
  pendingOrderId: string | null;
  pendingPaymentId: string | null;
  currentScreen: string;
  currentUser: string | null;
  lastSavedAt: string;
}

const STORAGE_KEY = 'nexora-crash-recovery';

export class CrashRecovery {
  /** Save current state for crash recovery. */
  save(state: Partial<RecoveryState>): void {
    try {
      const existing = this.load();
      const merged: RecoveryState = {
        unsavedCart: state.unsavedCart ?? existing?.unsavedCart ?? null,
        pendingOrderId: state.pendingOrderId ?? existing?.pendingOrderId ?? null,
        pendingPaymentId: state.pendingPaymentId ?? existing?.pendingPaymentId ?? null,
        currentScreen: state.currentScreen ?? existing?.currentScreen ?? 'dashboard',
        currentUser: state.currentUser ?? existing?.currentUser ?? null,
        lastSavedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch { /* localStorage may be unavailable */ }
  }

  /** Load the last saved recovery state. */
  load(): RecoveryState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) as RecoveryState : null;
    } catch { return null; }
  }

  /** Clear recovery state (call after successful save). */
  clear(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
  }

  /** Check if there's a pending recovery. */
  hasPendingRecovery(): boolean {
    const state = this.load();
    return !!(state && (state.unsavedCart || state.pendingOrderId));
  }

  /** Get the screen to restore to. */
  getLastScreen(): string {
    return this.load()?.currentScreen ?? 'dashboard';
  }

  /** Save the current cart for crash recovery. */
  saveCart(cart: unknown): void {
    this.save({ unsavedCart: cart });
  }

  /** Save current screen for crash recovery. */
  saveScreen(screen: string): void {
    this.save({ currentScreen: screen });
  }
}

export const crashRecovery = new CrashRecovery();
