import { useEffect, useRef, type ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { userFriendlyError } from '@/utils/error-helper';

interface AuthProviderProps {
  children: ReactNode;
}

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

  return <>{children}</>;
}
