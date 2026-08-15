import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { PageSpinner } from '@/components/ui/Spinner';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const staffProfile = useAuthStore((s) => s.staffProfile);
  const profileReady = useAuthStore((s) => s.profileReady);

  // No Firebase user at all — redirect immediately (avoids an infinite spinner
  // when profileReady is false after logout).
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // AuthProvider is still initialising (Firebase session check + profile restoration)
  if (isLoading || !profileReady) {
    return <PageSpinner />;
  }

  // Firebase user exists but no workspace context — staff PIN login required.
  // Email/password sign-in does not populate staffProfile; only staffPinLogin does.
  if (!staffProfile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
