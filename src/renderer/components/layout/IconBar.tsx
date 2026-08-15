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
import nexoraLogo from '@/assets/icons/nexora-logo-28.png';

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
    <aside className="fixed left-0 top-0 bottom-0 z-50 w-[56px] bg-white border-r border-[#e2e8e4] flex flex-col shrink-0">
      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="h-[48px] flex items-center justify-center border-b border-[#e2e8e4] hover:bg-[#f0f9f4] transition-colors shrink-0"
      >
        <div className="h-7 w-7 rounded-md bg-white flex items-center justify-center overflow-hidden">
          <img src={nexoraLogo} alt="Nexora Solution" className="h-7 w-7 object-contain" />
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center py-1.5 gap-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname === `/app${item.path}` ||
            (item.path !== '/' && (location.pathname.startsWith(item.path) || location.pathname.startsWith(`/app${item.path}`)));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 w-[44px] h-[46px] rounded-lg transition-all duration-150',
                isActive
                  ? 'text-[#187a49] bg-[#cdeddc]'
                  : 'text-[#416455] hover:text-[#187a49] hover:bg-[#f0f9f4]',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[8px] font-semibold leading-none tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-[10px] bottom-[10px] w-[3px] bg-[#187a49] rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="pb-1.5 flex flex-col items-center border-t border-[#e2e8e4] pt-1 shrink-0">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex flex-col items-center justify-center gap-0.5 w-[44px] h-[46px] rounded-lg text-[#416455] hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign out"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
          <span className="text-[8px] font-semibold">
            {isLoggingOut ? '...' : 'Exit'}
          </span>
        </button>
      </div>
    </aside>
  );
}
