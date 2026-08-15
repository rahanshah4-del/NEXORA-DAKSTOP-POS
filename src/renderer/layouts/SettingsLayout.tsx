import { Outlet, NavLink } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import {
  Settings, User, CreditCard, Shield, Info,
  Package, Wallet, Users, Receipt, Clock,
  UtensilsCrossed, BarChart3, DollarSign, Calendar,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const sidebarSections = [
  {
    label: 'Operations',
    items: [
      { label: 'Menu Configuration', path: '/app/settings/menu-config', icon: UtensilsCrossed },
      { label: 'Expense Management', path: '/app/settings/expenses', icon: DollarSign },
      { label: 'Close Day', path: '/app/settings/close-day', icon: Calendar },
      { label: 'Close Shift', path: '/app/settings/close-shift', icon: Clock },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Customer Management', path: '/app/settings/crm-customers', icon: Users },
      { label: 'Wallet Management', path: '/app/settings/wallets', icon: Wallet },
      { label: 'User Management', path: '/app/settings/users', icon: Shield },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'General', path: '/app/settings', icon: Settings, end: true },
      { label: 'Profile', path: '/app/settings/profile', icon: User },
      { label: 'Billing', path: '/app/settings/billing', icon: CreditCard },
      { label: 'Security', path: '/app/settings/security', icon: Shield },
      { label: 'About', path: '/app/settings/about', icon: Info },
    ],
  },
];

export function SettingsLayout() {
  return (
    <PageContainer padding="lg">
      <Breadcrumb items={[{ label: 'Management' }]} className="mb-4" />

      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 bg-primary/15 rounded-xl flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-content">Operations</h1>
          <p className="text-sm text-content-secondary">Manage your configuration and daily activities</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Side Nav */}
        <Card className="w-[200px] shrink-0 self-start" padding="none">
          <nav className="py-1">
            {sidebarSections.map((section) => (
              <div key={section.label} className="mb-1">
                <div className="px-3 py-2">
                  <span className="text-[9px] font-bold text-content-tertiary uppercase tracking-[0.1em]">{section.label}</span>
                </div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 text-[11px] font-medium transition-colors',
                        isActive
                          ? 'bg-surface-tertiary text-content border-r-2 border-primary'
                          : 'text-content-secondary hover:text-content hover:bg-surface-tertiary',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </PageContainer>
  );
}
