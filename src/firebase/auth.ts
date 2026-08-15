import {
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFunctions, getFirebaseFirestore } from './config';

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  return {
    uid: user.uid,
    email: user.email || email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export async function signOutUser() {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export function getCurrentUser() {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function onAuthChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// ── Staff PIN Login via Firebase Callable Function ──

export interface StaffPinLoginRequest {
  workspaceCode: string;
  staffLoginId: string;
  pin: string;
}

export interface StaffMember {
  uid: string;
  staffId: string;
  staffLoginId: string;
  workspaceId: string;
  ownerId: string;
  role: string;
  name: string;
  email: string;
}

export interface StaffPinLoginResponse {
  success: boolean;
  customToken: string | null;
  staff: StaffMember | null;
  errorCode: string | null;
  error: string | null;
}

/**
 * Authenticate a staff member using workspace code + staff login ID + PIN.
 *
 * Calls the deployed Cloud Function `teamStaffLogin` which validates
 * credentials against Firestore and returns a Firebase custom auth token.
 * The token is immediately exchanged for a real Firebase Auth session
 * via signInWithCustomToken(), establishing the session for this device.
 *
 * Error codes surfaced distinctly so the UI can differentiate:
 *   - functions/invalid-argument → missing field(s)
 *   - functions/permission-denied → wrong credentials / disabled / locked
 */
export async function staffPinLogin(
  workspaceCode: string,
  staffLoginId: string,
  pin: string,
): Promise<StaffPinLoginResponse> {
  try {
    const functions = getFirebaseFunctions();
    const callable = httpsCallable<StaffPinLoginRequest, { success: boolean; customToken: string; staff: StaffMember }>(
      functions,
      'teamStaffLogin',
    );

    const result = await callable({ workspaceCode, staffLoginId, pin });
    const data = result.data;

    if (!data.success || !data.customToken) {
      return {
        success: false,
        customToken: null,
        staff: null,
        errorCode: 'internal',
        error: 'Cloud function returned unexpected response',
      };
    }

    // Exchange the custom token for a real Firebase Auth session.
    // This establishes the session via the SDK's configured persistence
    // (browserLocalPersistence in config.ts), so the user stays logged in.
    const auth = getFirebaseAuth();
    await signInWithCustomToken(auth, data.customToken);

    // Confirm the signed-in user
    const currentUser = auth.currentUser;

    return {
      success: true,
      customToken: data.customToken,
      staff: data.staff,
      errorCode: null,
      error: null,
    };
  } catch (error: any) {
    // Surface Firebase HttpsError codes distinctly for the UI
    const code = error?.code ?? 'unknown';
    const message = error?.message ?? 'PIN login failed';

    return {
      success: false,
      customToken: null,
      staff: null,
      errorCode: code,
      error: message,
    };
  }
}

// ── Staff PIN Verification (no session switch) ──

export interface VerifyStaffPinRequest {
  workspaceId: string;
  pin: string;
}

export interface VerifyStaffPinResponse {
  success: boolean;
  staff: {
    uid: string;
    role: string;
    name: string;
  } | null;
  errorCode: string | null;
  error: string | null;
}

/**
 * Verify a staff member's PIN WITHOUT switching the current session.
 *
 * Calls the deployed Cloud Function `verifyStaffPin` which validates the PIN
 * against Firestore and returns the staff member's role if successful.
 *
 * Unlike `staffPinLogin`, this does NOT issue or exchange a custom token —
 * it's purely a verification check suitable for sensitive-action gating
 * (e.g. order cancellation requiring owner/admin approval).
 *
 * This requires an active internet connection — handle offline cases in the
 * caller with a clear message.
 */
export async function verifyStaffPin(
  workspaceId: string,
  pin: string,
): Promise<VerifyStaffPinResponse> {
  try {
    const functions = getFirebaseFunctions();
    // Cloud Function `verifyStaffPin` returns { valid, role, staffName, staffLoginId }.
    const callable = httpsCallable<
      VerifyStaffPinRequest,
      { valid: boolean; role: string; staffName: string; staffLoginId: string }
    >(functions, 'verifyStaffPin');

    const result = await callable({ workspaceId, pin });
    const data = result.data;

    if (!data.valid) {
      return {
        success: false,
        staff: null,
        errorCode: 'invalid_pin',
        error: 'Invalid PIN',
      };
    }

    return {
      success: true,
      staff: {
        uid: data.staffLoginId || '',
        role: data.role,
        name: data.staffName,
      },
      errorCode: null,
      error: null,
    };
  } catch (error: any) {
    const code = error?.code ?? 'unknown';
    const message = error?.message ?? 'PIN verification failed';

    return {
      success: false,
      staff: null,
      errorCode: code,
      error: message,
    };
  }
}

/**
 * Remove the Firebase Auth session (on logout).
 * The SDK's persistence layer handles session storage;
 * this just signs out the current user.
 */
export async function clearStaffSession(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch {
    // Sign out locally even if the network call fails
  }
}

// ── Owner profile resolution (used after email/password sign-in) ──

/**
 * After a plain email/password sign-in, resolve the owner's workspace and
 * build a staffProfile of the same shape that staffPinLogin would return.
 *
 * Strategy:
 *   1. Try users/{uid} first — the website stores owner profile data there.
 *   2. If that fails, treat the uid itself as the workspaceId, verify by
 *      reading workspaces/{uid} and checking ownerId === uid.
 *
 * Returns null if the account isn't linked to any restaurant workspace.
 */
export async function resolveOwnerProfile(uid: string): Promise<StaffMember | null> {
  const db = getFirebaseFirestore();

  // ── Primary path: users/{uid} document ──
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const workspaceId = data.workspaceId || uid;
      const name = data.name || data.displayName || '';
      const role = data.role || 'owner';

      if (!name) {
        // Try the workspace doc for a display name
        try {
          const wsDoc = await getDoc(doc(db, 'workspaces', workspaceId));
          if (wsDoc.exists()) {
            const wsData = wsDoc.data();
            return {
              uid,
              staffId: uid,
              staffLoginId: uid,        // owners don't have a staff login ID — use uid
              workspaceId,
              ownerId: wsData.ownerId || uid,
              role,
              name: wsData.name || wsData.restaurantName || uid,
              email: data.email || '',
            };
          }
        } catch { /* fall through */ }
      }

      return {
        uid,
        staffId: uid,
        staffLoginId: uid,
        workspaceId,
        ownerId: data.ownerId || workspaceId,
        role,
        name: name || uid,
        email: data.email || '',
      };
    }
  } catch (err: any) {
    console.warn('[resolveOwnerProfile] users/{uid} read failed:', err?.message ?? err);
    // Fall through to fallback
  }

  // ── Fallback path: treat uid as workspaceId ──
  try {
    const wsDoc = await getDoc(doc(db, 'workspaces', uid));
    if (wsDoc.exists()) {
      const data = wsDoc.data();
      if (data.ownerId === uid || data.createdBy === uid) {
        return {
          uid,
          staffId: uid,
          staffLoginId: uid,
          workspaceId: uid,
          ownerId: data.ownerId || uid,
          role: 'owner',
          name: data.name || data.restaurantName || uid,
          email: data.email || '',
        };
      }
    }
  } catch (err: any) {
    console.warn('[resolveOwnerProfile] workspaces/{uid} fallback failed:', err?.message ?? err);
  }

  return null;
}
