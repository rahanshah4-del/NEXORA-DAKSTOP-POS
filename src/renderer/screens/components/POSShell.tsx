import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard, ShoppingCart, LayoutGrid, Table, ChefHat,
  Users, UserCog, FileText, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react';
import nexoraLogo from '@/assets/icons/nexora-logo-28.png';

interface NavItem {
  id: string; label: string; icon: React.ReactNode; shortcut?: string;
}
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, shortcut: '⌥1' },
  { id: 'billing', label: 'Billing', icon: <ShoppingCart className="w-5 h-5" />, shortcut: '⌥2' },
  { id: 'products', label: 'Products', icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'tables', label: 'Tables', icon: <Table className="w-5 h-5" />, shortcut: '⌥4' },
  { id: 'kitchen', label: 'Kitchen', icon: <ChefHat className="w-5 h-5" />, shortcut: '⌥3' },
  { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" /> },
  { id: 'staff', label: 'Staff', icon: <UserCog className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

interface POSShellProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  children: React.ReactNode;
  topBar?: React.ReactNode;
}

export const POSShell: React.FC<POSShellProps> = ({ activeScreen, onNavigate, children, topBar }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleNav = useCallback((id: string) => {
    onNavigate(id);
  }, [onNavigate]);

  return (
    <div className="flex h-screen bg-surface-secondary overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-surface border-r border-border transition-[width] duration-300 ease-in-out shrink-0 select-none',
          collapsed ? 'w-[68px]' : 'w-[232px]',
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src={nexoraLogo} alt="Nexora Solution" className="w-7 h-7 object-contain" />
            </div>
            <span className={cn(
              'text-base font-bold text-content tracking-tight whitespace-nowrap transition-opacity duration-200',
              collapsed ? 'opacity-0 w-0' : 'opacity-100',
            )}>
              Nexora Solution
            </span>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary hover:text-content transition-all ml-auto',
              collapsed && 'mx-auto rotate-180',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto" aria-label="Screen navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-none'
                    : 'text-content-secondary hover:bg-surface-secondary hover:text-content',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                )}
                <span className={cn('shrink-0 transition-transform duration-150 group-hover:scale-110', isActive && 'text-primary')}>
                  {item.icon}
                </span>
                <span className={cn(
                  'whitespace-nowrap overflow-hidden transition-all duration-200 flex-1 text-left',
                  collapsed ? 'opacity-0 w-0' : 'opacity-100',
                )}>
                  {item.label}
                </span>
                {!collapsed && item.shortcut && (
                  <kbd className="hidden lg:inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-surface-secondary text-content-tertiary font-mono border border-border">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <div className={cn(
            'flex items-center gap-2.5 px-2 transition-opacity',
            collapsed ? 'justify-center' : '',
          )}>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0 ring-2 ring-primary/20">
              OP
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-content truncate">Operator</p>
                <p className="text-[10px] text-content-tertiary truncate">Cashier</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        {topBar && (
          <header className="h-14 shrink-0 bg-surface/80 backdrop-blur-sm border-b border-border flex items-center px-6 gap-4" role="banner">
            {topBar}
          </header>
        )}
        <main className="flex-1 overflow-y-auto" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};
