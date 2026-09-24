import { useEffect, useRef, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { notifyError } from '@/stores/toast-store';
import { userFriendlyError } from '@/utils/error-helper';

interface AuthProviderProps {
  children: ReactNode;
}

const SESSION_EXPIRED_MESSAGE = 'Session expired — please enter your PIN again.';

/**
 * An intentional sign-out also reports signedIn=false, and that push arrives
 * before useAuth().logout() clears the store. Re-check the store after this
 * delay: if it cleared itself in the meantime the sign-out was deliberate.
 */
const SESSION_DROP_GRACE_MS = 400;

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStaffProfile = useAuthStore((s) => s.setStaffProfile);
  const setError = useAuthStore((s) => s.setError);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setProfileReady = useAuthStore((s) => s.setProfileReady);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ── Browser dev mode (no Electron preload) — cannot authenticate ──
    if (!window.api) {
      setLoading(false);
      setError('Not running in Electron. Please launch the desktop app.');
      setProfileReady();
      return;
    }

    // ── Electron runtime — always require real Firebase auth ──
    window.api.auth
      .getCurrentUser()
      .then(async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);

          // Restore the staff profile (workspaceId, name, role) that was
          // persisted alongside the Firebase session at login time.
          try {
            const profile = await window.api.auth.getStaffProfile();
            if (profile) {
              setStaffProfile(profile);
            } else {
              console.warn(
                '[AuthProvider] No persisted staff profile found. ' +
                'If this is a fresh login, use the staff PIN login form — ' +
                'email/password sign-in does not set a workspace context.',
              );
            }
          } catch (err: any) {
            console.error(
              '[AuthProvider] Failed to restore staff profile:',
              err?.message ?? err,
            );
          }
        } else {
          // No Firebase session — user must log in via the staff PIN form
          setLoading(false);
          setError('Please log in with your staff credentials.');
        }
        setProfileReady();
      })
      .catch((err) => {
        console.error(
          '[AuthProvider] getCurrentUser failed:',
          err?.message ?? err,
        );
        setLoading(false);
        setError(userFriendlyError(err, 'auth provider initialisation'));
        setProfileReady();
      });
  }, [setUser, setStaffProfile, setError, setLoading, setProfileReady]);

  // ── Main-process session bridge ──
  // The main process owns the only real Firebase session. If it drops while
  // the app is running, lock the UI instead of leaving it open on top of
  // cloud calls that now fail silently.
  useEffect(() => {
    if (!window.api?.auth?.onStateChanged) return;

    let graceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = window.api.auth.onStateChanged((state) => {
      // Sign-in needs no handling — the login flows populate the store.
      if (state.signedIn) return;

      if (graceTimer) clearTimeout(graceTimer);
      graceTimer = setTimeout(() => {
        graceTimer = null;
        const store = useAuthStore.getState();
        // Already logged out (startup, or an intentional sign-out that has
        // since cleared the store) — nothing to announce.
        if (!store.isAuthenticated) return;

        // clearAuth() resets error to null, so set the message after it.
        // ProtectedRoute sends the user to /login once isAuthenticated flips.
        // Remembered workspace code + staff ID live in login-creds.enc and are
        // deliberately left untouched so LoginForm still prefills them.
        store.clearAuth();
        store.setError(SESSION_EXPIRED_MESSAGE);
        notifyError(SESSION_EXPIRED_MESSAGE);
      }, SESSION_DROP_GRACE_MS);
    });

    return () => {
      if (graceTimer) clearTimeout(graceTimer);
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
