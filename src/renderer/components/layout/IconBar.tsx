import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  Home, UtensilsCrossed, LayoutGrid, ClipboardList,
  ChefHat, BarChart3, Users, Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettingsStore } from '@/stores/settings-store';
import nexoraLogo from '@/assets/icons/nexora-logo.png';

const allNavItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'pos', label: 'POS', icon: UtensilsCrossed, path: '/billing' },
  { id: 'tables', label: 'Tables', icon: LayoutGrid, path: '/tables' },
  { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/orders' },
  { id: 'kds', label: 'KDS', icon: ChefHat, path: '/kitchen' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/customers' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

export function IconBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const kdsEnabled = useSettingsStore((s) => s.kdsEnabled);

  const navItems = useMemo(
    () => kdsEnabled ? allNavItems : allNavItems.filter((i) => i.id !== 'kds'),
    [kdsEnabled],
  );

  const handleLogout = async () => {
    if (isLoggingOut) return; // prevent double-click
    setIsLoggingOut(true);
    try {
      await logout();
      // ProtectedRoute will auto-redirect to /login when isAuthenticated flips
      // to false, but we navigate explicitly as a belt-and-suspenders measure
      // in case the router doesn't react to the store update immediately.
      navigate('/login', { replace: true });
    } catch {
      // logout() handles errors internally — navigation is the fallback
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex w-rail shrink-0 flex-col items-center bg-pos-rail">
      {/* Logo — 40px tile, full-resolution asset */}
      <button
        onClick={() => navigate('/')}
        aria-label="Go to dashboard"
        className="mt-2.5 mb-1 flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-pos-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pos-rail"
      >
        <img src={nexoraLogo} alt="Nexora" className="h-[40px] w-[40px] rounded-[10px] object-contain" />
      </button>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center justify-start gap-1 overflow-y-auto pt-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname === `/app${item.path}` ||
            (item.path !== '/' && (location.pathname.startsWith(item.path) || location.pathname.startsWith(`/app${item.path}`)));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-[46px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-0.5 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-pos-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pos-rail',
                isActive
                  ? 'bg-pos-lime/[0.14] text-pos-lime'
                  : 'text-pos-rail-icon hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.2 : 1.7} />
              <span className="w-full truncate whitespace-nowrap text-center text-[10px] font-medium leading-tight" title={item.label}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Log out"
        title="Log out"
        className="mb-2.5 mt-1.5 flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] border border-pos-deep-border text-pos-rail-icon transition-colors hover:border-pos-lime/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-pos-lime focus-visible:ring-offset-2 focus-visible:ring-offset-pos-rail"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </aside>
  );
}
