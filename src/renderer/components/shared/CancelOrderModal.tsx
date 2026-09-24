/**
 * CancelOrderModal — cancel-reason + admin-PIN approval modal.
 *
 * Clean rebuild (single source of truth).  Shared by Billing.tsx and
 * OrdersPage.tsx.  PIN entry is a fully on-screen numeric keypad — no
 * keyboard events are used anywhere in this flow, so it is immune to
 * any OS/renderer keyboard-capture issue.
 *
 * Flow:
 *   1. Enter a reason (free text or quick-select chip).
 *   2. Tap exactly 6 digits on the keypad.
 *   3. Confirm → verifyStaffPin (Cloud Function) → role gate → onConfirm(reason).
 *
 * The parent performs the actual cancellation inside onConfirm.
 */

import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { X, AlertTriangle, Delete } from 'lucide-react';

// ── Props ──

export interface CancelOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after PIN verification + role gate passes.  Parent executes the
   *  actual cancellation (SQLite, Firestore, table release, etc.). */
  onConfirm: (reason: string) => Promise<void>;
  /** Display identifier, e.g. "D-1047" or "Table 5".  Shown in the modal body. */
  orderIdentifier?: string;
  /** Whether the app currently has internet connectivity. */
  isOnline: boolean;
  /** Workspace ID for the verifyStaffPin Cloud Function call. */
  workspaceId: string;
}

// ── Constants ──

const QUICK_REASONS = [
  'Customer changed mind',
  'Wrong order',
  'Kitchen issue',
  'Duplicate order',
  'Item unavailable',
  'Customer left',
];

const ALLOWED_ROLES = ['owner', 'admin', 'accountant'];

const PIN_LENGTH = 6;
const PIN_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// ── Component ──

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderIdentifier,
  isOnline,
  workspaceId,
}) => {
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Reset on open ──
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setPin('');
      setPinError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Keypad handlers (onClick only — no keyboard events) ──

  const appendDigit = (d: string) => {
    setPin((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      return prev + d;
    });
    setPinError(null);
  };

  const backspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const clear = () => {
    setPin('');
    setPinError(null);
  };

  // ── Confirm ──

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    // Guard mirrors the button's disabled condition exactly.
    if (!trimmedReason || pin.length !== PIN_LENGTH || isVerifying) return;

    if (!isOnline) {
      setPinError('Cancellation requires internet connection to verify admin approval');
      return;
    }

    setPinError(null);
    setIsVerifying(true);
    console.log(`[CancelOrder] verifying PIN → workspaceId="${workspaceId}"`);

    try {
      const result = await window.api.auth.verifyStaffPin(workspaceId, pin);

      if (!result?.success) {
        const msg = result?.error || 'PIN verification failed';
        console.log(`[CancelOrder] verifyStaffPin FAILED → ${msg}`);
        setPinError(msg);
        setPin('');
        return;
      }

      const role = (result.staff?.role ?? '').toLowerCase();
      if (!ALLOWED_ROLES.includes(role)) {
        const msg = `Insufficient role: "${result.staff?.role || 'unknown'}". Only owner, admin, or accountant can cancel orders.`;
        console.log(`[CancelOrder] verifyStaffPin role denied → ${msg}`);
        setPinError(msg);
        setPin('');
        return;
      }

      console.log(`[CancelOrder] verifyStaffPin OK → role="${role}", proceeding to cancel`);
      await onConfirm(trimmedReason);
    } catch (err: any) {
      const msg = err?.message ?? 'PIN verification failed';
      console.log(`[CancelOrder] verifyStaffPin EXCEPTION → ${msg}`);
      setPinError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Explicit, simple disabled condition — nothing implicit.
  const confirmDisabled = pin.length !== PIN_LENGTH || !reason.trim() || isVerifying;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isVerifying) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-[400px] bg-white rounded-xl shadow-2xl border border-[#dee2e6] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#dee2e6] bg-[#f8faf9]">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="text-[13px] font-bold text-[#111814]">Cancel Order</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="p-1 rounded text-[#94a399] hover:text-[#111814] hover:bg-[#e2e8e4] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-[#47554d]">
            Please provide a reason for cancelling this order
            {orderIdentifier ? ` (${orderIdentifier})` : ''}.
            Admin approval is required — enter an owner or admin PIN to confirm.
          </p>

          {/* Quick-select reason chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  'px-2.5 py-1 text-[10px] font-medium rounded-full border transition-colors',
                  reason === r
                    ? 'bg-red-500 text-white border-red-500'
                    : 'border-[#dee2e6] text-[#47554d] hover:border-red-300 hover:text-red-500 hover:bg-red-50',
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Reason input (keyboard typing works fine here) */}
          <div>
            <label className="block text-[10px] font-semibold text-[#47554d] mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Type a reason or select one above..."
              autoFocus
              className="w-full h-[34px] px-3 text-[11px] border border-[#dee2e6] rounded-lg focus:outline-none focus:ring-1 focus:ring-red-300 focus:border-red-400"
            />
          </div>

          {/* Admin PIN — on-screen keypad */}
          <div>
            <label className="block text-[10px] font-semibold text-[#47554d] mb-1">
              Admin PIN <span className="text-red-500">*</span>
            </label>

            {/* Masked dot display */}
            <div className="flex items-center justify-center gap-3 h-11 rounded-lg border border-[#dee2e6] bg-[#f8faf9] mb-2">
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-3.5 w-3.5 rounded-full transition-colors',
                    i < pin.length ? 'bg-emerald-600' : 'bg-gray-200',
                  )}
                />
              ))}
            </div>

            {/* 3×4 keypad */}
            <div className="grid grid-cols-3 gap-2">
              {PIN_DIGITS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => appendDigit(d)}
                  className="h-12 rounded-lg bg-white border border-[#dee2e6] text-[18px] font-semibold text-[#111814] hover:bg-[#f1f5f2] hover:border-emerald-500 active:scale-[0.97] transition-all select-none"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={clear}
                className="h-12 rounded-lg bg-[#f1f5f2] border border-[#dee2e6] text-[12px] font-semibold text-[#47554d] hover:bg-[#e2e8e0] active:scale-[0.97] transition-all select-none"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => appendDigit('0')}
                className="h-12 rounded-lg bg-white border border-[#dee2e6] text-[18px] font-semibold text-[#111814] hover:bg-[#f1f5f2] hover:border-emerald-500 active:scale-[0.97] transition-all select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={backspace}
                aria-label="Backspace"
                className="h-12 rounded-lg bg-[#f1f5f2] border border-[#dee2e6] text-[#47554d] hover:bg-[#e2e8e0] active:scale-[0.97] transition-all select-none flex items-center justify-center"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            {pinError && (
              <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {pinError}
              </p>
            )}
            <p className="text-[9px] text-content-tertiary mt-1">
              Tap the keypad to enter the 6-digit approval PIN. Only owners, admins, and accountants can cancel orders.
              {!isOnline && ' Internet connection required.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="flex-1 h-[34px] text-[11px] font-medium border border-[#dee2e6] text-[#47554d] rounded-lg hover:bg-[#f1f5f2] transition-colors disabled:opacity-50"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              className={cn(
                'flex-1 h-[34px] text-[11px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5',
                confirmDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
              )}
            >
              {isVerifying ? (
                'Verifying...'
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
