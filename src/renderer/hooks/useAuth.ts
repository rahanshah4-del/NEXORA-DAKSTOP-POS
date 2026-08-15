import { useAuthStore, type StaffProfile } from '@/stores/auth-store';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const error = useAuthStore((s) => s.error);
  const setUser = useAuthStore((s) => s.setUser);
  const setStaffProfile = useAuthStore((s) => s.setStaffProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const setProfileReady = useAuthStore((s) => s.setProfileReady);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!window.api) {
        throw new Error('Not running in Electron');
      }
      const result = await window.api.auth.signIn(email, password);
      if (result.success && result.user) {
        if (!result.staff) {
          throw new Error('This account is not linked to a restaurant workspace. Please use Staff PIN login.');
        }
        setUser(result.user);
        // Email login resolves the owner's workspace profile server-side.
        setStaffProfile({
          workspaceId: result.staff.workspaceId,
          staffUid: result.staff.uid,
          staffName: result.staff.name,
          staffRole: result.staff.role,
        });
        setProfileReady();

        return result.user;
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (err: any) {
      const message = err.message ?? 'Authentication failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (window.api) {
        await window.api.auth.signOut();
      }
    } catch {
      // Sign out locally even if remote fails
    } finally {
      setStaffProfile(null); // clear staff profile from store
      clearAuth();
    }
  };

  /** Staff PIN login via Firebase Callable Function `teamStaffLogin`. */
  const staffPinLogin = async (workspaceCode: string, staffLoginId: string, pin: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!window.api) {
        throw new Error('Not running in Electron');
      }

      const result = await window.api.auth.staffPinLogin(workspaceCode, staffLoginId, pin);

      if (result.success && result.staff) {
        // Staff authenticated via custom token — store full staff profile
        setUser({
          uid: result.staff.uid,
          email: result.staff.email,
          displayName: result.staff.name,
          photoURL: null,
        });
        // Persist workspace-scoped profile for Firestore calls
        setStaffProfile({
          workspaceId: result.staff.workspaceId,
          staffUid: result.staff.uid,
          staffName: result.staff.name,
          staffRole: result.staff.role,
        });
        // Signal that the profile is ready — needed for ProtectedRoute's
        // staffProfile guard to pass after a logout → re-login cycle.
        setProfileReady();
        return result;
      }

      // Surface distinct error cases for the UI
      if (result.errorCode === 'functions/invalid-argument') {
        throw new Error('Workspace code, staff ID, and PIN are required.');
      }
      if (result.error?.includes('locked')) {
        throw new Error('This staff access is locked. Contact the owner.');
      }
      if (result.error?.includes('disabled')) {
        throw new Error('This staff access is disabled.');
      }
      throw new Error(result.error || 'Invalid team login details.');
    } catch (err: any) {
      const message = err.message ?? 'Staff PIN login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    staffProfile,
    isLoading,
    isAuthenticated,
    error,
    login,
    logout,
    staffPinLogin,
  };
}
