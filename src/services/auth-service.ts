/**
 * Auth Service — business logic layer for authentication.
 * Delegates to Firebase Auth via IPC in production.
 */

import type { AuthUser } from '@/stores/auth-store';

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    if (!window.api) {
      throw new Error('Not running in Electron');
    }
    const result = await window.api.auth.signIn(email, password);
    if (!result.success || !result.user) {
      throw new Error(result.error || 'Login failed');
    }
    return result.user;
  },

  async logout(): Promise<void> {
    if (window.api) {
      await window.api.auth.signOut();
    }
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!window.api) return null;
    return window.api.auth.getCurrentUser();
  },

  async staffPinLogin(
    workspaceCode: string,
    staffLoginId: string,
    pin: string,
  ): Promise<{
    success: boolean;
    customToken: string | null;
    staff: { uid: string; staffId: string; staffLoginId: string; workspaceId: string; ownerId: string; role: string; name: string; email: string } | null;
    errorCode: string | null;
    error: string | null;
  }> {
    if (!window.api) {
      return { success: false, customToken: null, staff: null, errorCode: 'no-electron', error: 'Not running in Electron' };
    }
    return window.api.auth.staffPinLogin(workspaceCode, staffLoginId, pin);
  },
};
