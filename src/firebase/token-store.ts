/**
 * token-store.ts — Secure auth token persistence using Electron safeStorage.
 *
 * NOTE: For the staff PIN login flow, Firebase session persistence is handled
 * by the Firebase Auth SDK via `browserLocalPersistence` (configured in config.ts).
 * When staffPinLogin() calls signInWithCustomToken(), the SDK automatically
 * persists the session in IndexedDB — no manual token storage is needed.
 *
 * This module remains available as a utility for encrypting arbitrary sensitive
 * data at rest using the OS-level keychain:
 *   - macOS: Keychain Services
 *   - Windows: DPAPI (Data Protection API)
 *   - Linux: libsecret / kwallet
 *
 * On platforms where safeStorage is unavailable (browser dev mode),
 * we skip persistence entirely.
 */

import { safeStorage, app } from 'electron';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const TOKEN_FILENAME = 'auth-token.enc';
const STAFF_PROFILE_FILENAME = 'staff-profile.enc';
const LOGIN_CREDS_FILENAME = 'login-creds.enc';

function getTokenPath(): string {
  return join(app.getPath('userData'), TOKEN_FILENAME);
}

/**
 * Check if safeStorage is available on this platform.
 * Returns false in browser dev mode (no Electron).
 */
export function isSecureStorageAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Encrypt and persist an auth token to disk.
 * The token is encrypted using the OS keychain before writing.
 *
 * @param token The plaintext token to store.
 * @returns true if saved successfully, false otherwise.
 */
export function saveToken(token: string): boolean {
  try {
    if (!isSecureStorageAvailable()) {
      console.warn('[TokenStore] safeStorage unavailable — token not persisted');
      return false;
    }

    const encrypted = safeStorage.encryptString(token);
    const tokenPath = getTokenPath();
    writeFileSync(tokenPath, encrypted);
    return true;
  } catch (error) {
    console.error('[TokenStore] Failed to save token:', error);
    return false;
  }
}

/**
 * Decrypt and load the persisted auth token.
 *
 * @returns The plaintext token, or null if none exists or decryption fails.
 */
export function loadToken(): string | null {
  try {
    if (!isSecureStorageAvailable()) return null;

    const tokenPath = getTokenPath();
    if (!existsSync(tokenPath)) return null;

    const encrypted = readFileSync(tokenPath);
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error('[TokenStore] Failed to load token:', error);
    return null;
  }
}

/**
 * Remove the persisted token from disk (on logout).
 */
export function clearToken(): void {
  try {
    const tokenPath = getTokenPath();
    if (existsSync(tokenPath)) {
      unlinkSync(tokenPath);
    }
  } catch (error) {
    console.error('[TokenStore] Failed to clear token:', error);
  }
}

// ── Staff Profile persistence ──

interface PersistedStaffProfile {
  workspaceId: string;
  staffUid: string;
  staffName: string;
  staffRole: string;
}

function getStaffProfilePath(): string {
  return join(app.getPath('userData'), STAFF_PROFILE_FILENAME);
}

/**
 * Encrypt and persist the staff profile to disk.
 * Stored alongside the auth token so the profile survives app restarts.
 */
export function saveStaffProfile(profile: PersistedStaffProfile): boolean {
  try {
    if (!isSecureStorageAvailable()) {
      console.warn('[TokenStore] safeStorage unavailable — staff profile not persisted');
      return false;
    }
    const json = JSON.stringify(profile);
    const encrypted = safeStorage.encryptString(json);
    writeFileSync(getStaffProfilePath(), encrypted);
    return true;
  } catch (error) {
    console.error('[TokenStore] Failed to save staff profile:', error);
    return false;
  }
}

/**
 * Decrypt and load the persisted staff profile.
 * Returns null if no profile exists or decryption fails.
 */
export function loadStaffProfile(): PersistedStaffProfile | null {
  try {
    if (!isSecureStorageAvailable()) return null;

    const profilePath = getStaffProfilePath();
    if (!existsSync(profilePath)) return null;

    const encrypted = readFileSync(profilePath);
    const json = safeStorage.decryptString(encrypted);
    return JSON.parse(json) as PersistedStaffProfile;
  } catch (error) {
    console.error('[TokenStore] Failed to load staff profile:', error);
    return null;
  }
}

/**
 * Remove the persisted staff profile from disk (on logout).
 */
export function clearStaffProfile(): void {
  try {
    const profilePath = getStaffProfilePath();
    if (existsSync(profilePath)) {
      unlinkSync(profilePath);
    }
  } catch (error) {
    console.error('[TokenStore] Failed to clear staff profile:', error);
  }
}

// ── Login Credential Persistence (remember workspace + staff ID, never PIN) ──

interface PersistedLoginCreds {
  workspaceCode: string;
  staffLoginId: string;
}

function getLoginCredsPath(): string {
  return join(app.getPath('userData'), LOGIN_CREDS_FILENAME);
}

export function saveLoginCredentials(creds: PersistedLoginCreds): boolean {
  try {
    if (!isSecureStorageAvailable()) return false;
    const json = JSON.stringify(creds);
    const encrypted = safeStorage.encryptString(json);
    writeFileSync(getLoginCredsPath(), encrypted);
    return true;
  } catch (error) {
    console.error('[TokenStore] Failed to save login credentials:', error);
    return false;
  }
}

export function loadLoginCredentials(): PersistedLoginCreds | null {
  try {
    if (!isSecureStorageAvailable()) return null;
    const credsPath = getLoginCredsPath();
    if (!existsSync(credsPath)) return null;
    const encrypted = readFileSync(credsPath);
    const json = safeStorage.decryptString(encrypted);
    return JSON.parse(json) as PersistedLoginCreds;
  } catch (error) {
    console.error('[TokenStore] Failed to load login credentials:', error);
    return null;
  }
}

export function clearLoginCredentials(): void {
  try {
    const credsPath = getLoginCredsPath();
    if (existsSync(credsPath)) {
      unlinkSync(credsPath);
    }
  } catch (error) {
    console.error('[TokenStore] Failed to clear login credentials:', error);
  }
}
