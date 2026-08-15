/**
 * error-helper.ts — Central error-translation for user-facing messages.
 *
 * Maps raw technical errors to plain-language, actionable messages.
 * ALWAYS logs the full original error to the console for debugging.
 * NEVER shows error codes, function names, IPC channel names, or stack traces to users.
 */

/**
 * Translate a raw error value (Error object, string, or unknown) into a
 * human-readable message suitable for display in the UI.
 *
 * @param raw    The raw error — can be an Error, a string, or anything thrown.
 * @param context Optional label describing where the error occurred
 *               (e.g. "loading orders"). Used only in the console log.
 * @returns A plain-language message for the user.
 */
export function userFriendlyError(raw: unknown, context?: string): string {
  // Extract the best available message string
  const message = extractMessage(raw);

  // Always log the FULL raw error to the console so we can debug.
  // This includes the message, stack trace, and any error code.
  if (context) {
    console.error(`[ErrorHandler] ${context}:`, raw);
    if (raw instanceof Error && raw.stack) {
      console.error(`[ErrorHandler] ${context} stack:`, raw.stack);
    }
  } else {
    console.error('[ErrorHandler]', raw);
    if (raw instanceof Error && raw.stack) {
      console.error('[ErrorHandler] stack:', raw.stack);
    }
  }

  // Also forward the full original error to the main-process log so it
  // appears in the terminal — renderer DevTools may be closed or cleared.
  try {
    const code = (raw && typeof raw === 'object' && 'code' in (raw as Record<string, unknown>))
      ? (raw as Record<string, unknown>).code : undefined;
    const stack = raw instanceof Error ? raw.stack : undefined;
    window.api?.app?.log?.('error', context ? `[ErrorHandler] ${context}` : '[ErrorHandler]', {
      message,
      code: code ?? null,
      stack: stack ?? null,
    });
  } catch {
    // window.api may not be available (e.g. during SSR / early init).
    // The renderer console.error above already captured the error.
  }

  const lower = message.toLowerCase();

  // ── Auth / Session ──
  if (lower.includes('unauthenticated') || lower.includes('token expired') || lower.includes('auth/id-token-expired')) {
    return 'Your session expired. Please sign in again.';
  }
  if (lower.includes('auth/user-not-found') || lower.includes('no user record')) {
    return 'No account found with that email address.';
  }
  if (lower.includes('auth/wrong-password') || lower.includes('invalid password') || lower.includes('invalid login')) {
    return 'Incorrect password. Please try again.';
  }
  if (lower.includes('auth/too-many-requests') || lower.includes('too many attempts')) {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  if (lower.includes('auth/email-already-in-use')) {
    return 'An account with that email already exists.';
  }
  if (lower.includes('auth/weak-password')) {
    return 'Password is too weak. Please use a stronger password.';
  }
  if (lower.includes('disabled') && lower.includes('staff')) {
    return 'This staff access is disabled.';
  }

  // ── Permissions ──
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions') || lower.includes('insufficient permission')) {
    return "You don't have access to this. Ask the owner to check your permissions.";
  }

  // ── Network ──
  if (
    lower.includes('unavailable') || lower.includes('network') ||
    lower.includes('timeout') || lower.includes('timed out') ||
    lower.includes('offline_timeout') || lower.includes('econnrefused') ||
    lower.includes('enotfound') || lower.includes('dns') ||
    lower.includes('fetch failed') || lower.includes('network request failed') ||
    lower.includes('failed to fetch') && !lower.includes('orders')
  ) {
    return 'No internet connection. Your work is saved locally and will sync automatically.';
  }

  // ── Firestore indices ──
  if (lower.includes('failed-precondition') || (lower.includes('index') && lower.includes('https://console.firebase.google'))) {
    // Log the index creation URL prominently so we can find it
    console.warn('[ErrorHandler] Firestore index needed — full error follows:');
    console.warn(raw);
    return "This report isn't ready yet. Please contact support.";
  }

  // ── Not found ──
  if (lower.includes('not-found') || lower.includes('not found') || lower.includes('does not exist')) {
    return "That item no longer exists. It may have been deleted.";
  }

  // ── Already exists ──
  if (lower.includes('already-exists') || lower.includes('already exists')) {
    return 'This already exists.';
  }

  // ── IPC / Electron ──
  if (lower.includes('error invoking remote method') || lower.includes('ipc')) {
    return 'Something went wrong. Please try again.';
  }

  // ── Firestore / Firebase SDK generic ──
  if (lower.includes('firebaseerror') || lower.includes('firestore')) {
    return 'Something went wrong. Please try again.';
  }

  // ── Fallback ──
  // For genuinely unknown errors, return a calm generic message.
  // The raw error is already logged above.
  return 'Something went wrong. Please try again.';
}

/** Extract a string message from anything that might be thrown. */
function extractMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw instanceof Error) return raw.message;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.code === 'string') return obj.code;
  }
  return String(raw ?? 'Unknown error');
}
