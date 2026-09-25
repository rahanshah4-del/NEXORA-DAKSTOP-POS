import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ToastContainer } from '@/components/shared/ToastContainer';
import { useMenuSync } from '@/hooks/firestore/useMenuSync';
import { useWorkspaceCurrency } from '@/hooks/useWorkspaceCurrency';
import { router } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Mounted once at the app root so the live menuItems listener stays active on
// every route (Billing/Tables/Kitchen/Orders are standalone routes outside
// AppLayout, which previously meant the listener was torn down there).
function MenuSyncBridge() {
  useMenuSync();
  useWorkspaceCurrency();
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MenuSyncBridge />
          <RouterProvider router={router} />
          <ToastContainer />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
