import { useSidebar } from '@/hooks/useSidebar';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/utils/cn';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { SidebarItem } from './SidebarItem';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ChefHat,
  Users,
  Package,
  Boxes,
  BarChart3,
  UserCog,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Wallet,
  CreditCard,
  CalendarCheck,
} from 'lucide-react';
import nexoraLogo from '@/assets/icons/nexora-logo-28.png';
import type { ReactNode } from 'react';

interface NavSection {
  label: string;
  items: {
    label: string;
    path: string;
    icon: typeof LayoutDashboard;
    children?: { label: string; path: string }[];
  }[];
}

const navigation: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { label: 'Restaurant Billing', path: '/billing', icon: UtensilsCrossed },
      { label: 'Tables', path: '/tables', icon: Grid3X3 },
      { label: 'Kitchen', path: '/kitchen', icon: ChefHat },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Products', path: '/products', icon: Package },
      { label: 'Inventory', path: '/inventory', icon: Boxes },
      { label: 'Reservations', path: '/reservations', icon: CalendarCheck },
      { label: 'Payments', path: '/payments', icon: CreditCard },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Employees', path: '/employees', icon: UserCog },
    ],
  },
  {
    label: 'POS',
    items: [
      { label: 'Cash Register', path: '/cash-sessions', icon: Wallet },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', path: '/settings', icon: Settings }],
  },
];

export function Sidebar() {
  const { collapsed, isExpanded, toggle, setCollapsed, handleMouseEnter, handleMouseLeave } =
    useSidebar();
  const setActiveRoute = useUIStore((s) => s.setActiveRoute);

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-[var(--z-sidebar)]',
        'flex flex-col bg-sidebar border-r border-border',
        'transition-all duration-200 ease-in-out',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-header px-4 border-b border-sidebar-hover shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src={nexoraLogo} alt="Nexora Solution" className="h-8 w-8 object-contain" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold text-sidebar-text-active tracking-tight whitespace-nowrap">
              Nexora Solution
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-4">
          {navigation.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-semibold text-sidebar-text uppercase tracking-[0.08em]">
                    {section.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.path}
                    label={item.label}
                    path={item.path}
                    icon={item.icon}
                    collapsed={collapsed}
                    children={item.children}
                    onNavigate={() => setActiveRoute(item.path)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-hover shrink-0">
        <button
          onClick={toggle}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg',
            'text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-hover',
            'transition-all duration-150',
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 flex-shrink-0" />
          ) : (
            <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
          )}
          {!collapsed && <span className="font-medium text-xs">Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
}
