import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ButtonSpinner } from '@/components/ui/Loading';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2, IdCard, Lock, KeyRound, Eye, EyeOff, Mail,
  Check, X,
} from 'lucide-react';

type LoginMode = 'email' | 'staff-pin';

interface SavedCreds {
  workspaceCode: string;
  staffLoginId: string;
}

export function LoginForm() {
  // ── Email/Password mode ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // ── Staff PIN mode ──
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [staffLoginId, setStaffLoginId] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [mode, setMode] = useState<LoginMode>('staff-pin');
  const [formError, setFormError] = useState<string | null>(null);

  // ── Remembered login (Part 1) ──
  const [savedCreds, setSavedCreds] = useState<SavedCreds | null>(null);
  const [credsLoading, setCredsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const { login, staffPinLogin } = useAuth();
  const navigate = useNavigate();

  // Load remembered credentials on mount
  useEffect(() => {
    (async () => {
      try {
        if (window.api?.auth?.loadLoginCreds) {
          const creds = await window.api.auth.loadLoginCreds();
          if (creds) {
            setSavedCreds(creds as SavedCreds);
            setWorkspaceCode((creds as SavedCreds).workspaceCode);
            setStaffLoginId((creds as SavedCreds).staffLoginId);
          }
        }
      } catch { /* silent — optional feature */ }
      finally { setCredsLoading(false); }
    })();
  }, []);

  const displayError = formError;
  const isSubmitting = emailSubmitting;

  // ── Email submit ──
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) { setFormError('Email is required'); return; }
    if (!password) { setFormError('Password is required'); return; }

    setEmailSubmitting(true);
    try {
      await login(email, password);
      // Brief success state before navigation
      setShowSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (err: any) {
      setFormError(err?.message ?? 'Sign in failed');
    } finally {
      setEmailSubmitting(false);
    }
  };

  // ── Staff PIN submit ──
  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const ws = workspaceCode.trim();
    const sid = staffLoginId.trim();
    const pin = staffPin;

    if (!ws) { setFormError('Workspace code is required'); return; }
    if (!sid) { setFormError('Staff login ID is required'); return; }
    if (!pin) { setFormError('PIN is required'); return; }

    try {
      const result = await staffPinLogin(ws, sid, pin);
      if (result.success) {
        // Persist workspace code + staff login ID for next time (never the PIN)
        try {
          await window.api.auth.saveLoginCreds(ws, sid);
        } catch { /* non-critical */ }
        // Brief success state before navigation
        setShowSuccess(true);
        const name = result.staff?.name ?? '';
        setTimeout(() => navigate('/', { replace: true }), name ? 1000 : 600);
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Sign in failed';
      setFormError(msg);
      // Clear PIN on failure so they can retry immediately;
      // keep workspace code and staff ID intact
      setStaffPin('');
    }
  };

  // ── Switch account ──
  const handleSwitchAccount = async () => {
    setSavedCreds(null);
    setWorkspaceCode('');
    setStaffLoginId('');
    setStaffPin('');
    setFormError(null);
    try {
      await window.api.auth.clearLoginCreds();
    } catch { /* non-critical */ }
  };

  // Auto-focus the PIN field when remembered credentials are loaded
  const pinRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!credsLoading && savedCreds && pinRef.current) {
      pinRef.current.focus();
    }
  }, [credsLoading, savedCreds]);

  // ═══ Success state ═══
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-slide-up">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-content">Signed in</h2>
          <p className="text-sm text-content-secondary mt-1">Welcome back</p>
        </div>
      </div>
    );
  }

  // ═══ Loading saved creds ═══
  if (credsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl">
        <button
          type="button"
          onClick={() => { setMode('staff-pin'); setFormError(null); }}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
            mode === 'staff-pin'
              ? 'bg-surface text-content shadow-sm'
              : 'text-content-secondary hover:text-content'
          }`}
        >
          Staff PIN
        </button>
        <button
          type="button"
          onClick={() => { setMode('email'); setFormError(null); }}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
            mode === 'email'
              ? 'bg-surface text-content shadow-sm'
              : 'text-content-secondary hover:text-content'
          }`}
        >
          Email
        </button>
      </div>

      {/* Error display */}
      {displayError && (
        <div className="flex items-start gap-2 px-3 py-2.5 text-sm rounded-lg border border-red-200 bg-red-50 text-red-700">
          <X className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {/* ── Staff PIN Login ── */}
      {mode === 'staff-pin' && (
        <form onSubmit={handlePinSubmit} className="space-y-4">
          {savedCreds ? (
            /* ── Returning user: PIN only + Switch account ── */
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-content">Welcome back</h2>
                <p className="text-sm text-content-secondary mt-1">
                  Enter your PIN to continue
                </p>
              </div>

              {/* Remembered identity display */}
              <div className="bg-surface-secondary rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-content-tertiary shrink-0" />
                  <span className="text-content-secondary text-xs">Workspace:</span>
                  <span className="font-semibold text-content">{savedCreds.workspaceCode}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <IdCard className="h-4 w-4 text-content-tertiary shrink-0" />
                  <span className="text-content-secondary text-xs">Staff ID:</span>
                  <span className="font-semibold text-content">{savedCreds.staffLoginId}</span>
                </div>
              </div>

              <Input
                label="PIN"
                type={showPin ? 'text' : 'password'}
                placeholder="Enter your PIN"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                leftIcon={<KeyRound className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPin(!showPin)} className="focus:outline-none" tabIndex={-1}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="off"
                ref={pinRef}
                disabled={isSubmitting}
              />

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <ButtonSpinner className="text-white" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </Button>

              <button
                type="button"
                onClick={handleSwitchAccount}
                className="w-full text-center text-xs text-content-tertiary hover:text-content-secondary transition-colors py-1"
              >
                Not you? Use a different account
              </button>
            </>
          ) : (
            /* ── Full three-field form for first-time login ── */
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-semibold text-content">Staff Login</h2>
                <p className="text-sm text-content-secondary mt-1">
                  Enter your workspace code, staff ID, and PIN
                </p>
              </div>

              <Input
                label="Workspace Code"
                placeholder="e.g. NXK7M2"
                value={workspaceCode}
                onChange={(e) => setWorkspaceCode(e.target.value)}
                leftIcon={<Building2 className="h-4 w-4" />}
                autoFocus
                disabled={isSubmitting}
              />

              <Input
                label="Staff Login ID"
                placeholder="e.g. CSH-A4F7"
                value={staffLoginId}
                onChange={(e) => setStaffLoginId(e.target.value)}
                leftIcon={<IdCard className="h-4 w-4" />}
                disabled={isSubmitting}
              />

              <Input
                label="PIN"
                type={showPin ? 'text' : 'password'}
                placeholder="Enter your 4-6 digit PIN"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value)}
                leftIcon={<KeyRound className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowPin(!showPin)} className="focus:outline-none" tabIndex={-1}>
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                autoComplete="off"
                disabled={isSubmitting}
              />

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <ButtonSpinner className="text-white" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </Button>
            </>
          )}
        </form>
      )}

      {/* ── Email/Password Login ── */}
      {mode === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-content">Welcome back</h2>
            <p className="text-sm text-content-secondary mt-1">
              Sign in to your account to continue
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="you@nexorasolution.online"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none" tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            autoComplete="current-password"
            disabled={isSubmitting}
          />

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <ButtonSpinner className="text-white" />
                Signing in…
              </span>
            ) : 'Sign In'}
          </Button>

          <p className="text-center text-xs text-content-tertiary">
            Forgot your password? Contact your administrator.
          </p>
        </form>
      )}
    </div>
  );
}
