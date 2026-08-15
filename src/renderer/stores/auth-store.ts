import { create } from 'zustand';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface StaffProfile {
  workspaceId: string;
  staffUid: string;
  staffName: string;
  staffRole: string;
}

interface AuthState {
  user: AuthUser | null;
  staffProfile: StaffProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  /** True after AuthProvider finishes its initial profile restoration attempt
   *  (success or failure). Guards against the timing gap between setUser()
   *  and the async getStaffProfile() call. */
  profileReady: boolean;

  setUser: (user: AuthUser | null) => void;
  setStaffProfile: (profile: StaffProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProfileReady: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  staffProfile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  profileReady: false,

  setUser: (user: AuthUser | null) =>
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
      error: null,
    }),

  setStaffProfile: (profile: StaffProfile | null) =>
    set({ staffProfile: profile }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setError: (error: string | null) =>
    set({
      error,
      isLoading: false,
    }),

  setProfileReady: () => set({ profileReady: true }),

  clearAuth: () =>
    set({
      user: null,
      staffProfile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      // Keep profileReady true on logout — otherwise ProtectedRoute's spinner
      // never resolves because AuthProvider's init ref is already consumed.
      profileReady: true,
    }),
}));
