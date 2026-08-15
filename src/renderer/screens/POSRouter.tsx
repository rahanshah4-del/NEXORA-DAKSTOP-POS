import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { POSShell } from './components/POSShell';
import { KeyboardShortcuts, POS_SHORTCUTS } from './components/KeyboardShortcuts';
import { DashboardScreen } from './Dashboard/DashboardScreen';
import { BillingScreen } from './Billing/BillingScreen';
import { ProductsScreen } from './Products/ProductsScreen';
import { TablesScreen } from './Tables/TablesScreen';
import { KitchenScreen } from './Kitchen/KitchenScreen';
import { CustomersScreen } from './Customers/CustomersScreen';
import { StaffScreen } from './Staff/StaffScreen';
import { ReportsScreen } from './Reports/ReportsScreen';
import { SettingsScreen } from './Settings/SettingsScreen';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import { Wifi, WifiOff, Clock, Search, Plus } from 'lucide-react';

const SCREENS: Record<string, React.FC> = {
  dashboard: DashboardScreen, billing: BillingScreen, products: ProductsScreen,
  tables: TablesScreen, kitchen: KitchenScreen, customers: CustomersScreen,
  staff: StaffScreen, reports: ReportsScreen, settings: SettingsScreen,
};

const SCREEN_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', billing: 'Billing / POS', products: 'Products',
  tables: 'Tables', kitchen: 'Kitchen Display', customers: 'Customers',
  staff: 'Staff', reports: 'Reports', settings: 'Settings',
};

interface POSRouterProps { initialScreen?: string; }

export const POSRouter: React.FC<POSRouterProps> = ({ initialScreen = 'dashboard' }) => {
  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const [time, setTime] = useState(new Date());
  const [isOnline] = useState(true);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const shortcuts = useMemo(() => [
    { ...POS_SHORTCUTS.NEW_ORDER, handler: () => setActiveScreen('billing') },
    { ...POS_SHORTCUTS.SEARCH, handler: () => setActiveScreen('billing') },
    { ...POS_SHORTCUTS.DASHBOARD, handler: () => setActiveScreen('dashboard') },
    { ...POS_SHORTCUTS.BILLING, handler: () => setActiveScreen('billing') },
    { ...POS_SHORTCUTS.KITCHEN, handler: () => setActiveScreen('kitchen') },
    { ...POS_SHORTCUTS.TABLES, handler: () => setActiveScreen('tables') },
  ], []);

  const ScreenComponent = SCREENS[activeScreen] ?? DashboardScreen;

  const topBar = (
    <div className="flex items-center justify-between w-full gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-content">{SCREEN_LABELS[activeScreen]}</h1>
        <div className="hidden md:flex items-center gap-1.5">
          <Badge variant={isOnline ? 'success' : 'danger'} size="sm" dot>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden lg:flex items-center gap-1.5 text-xs text-content-tertiary font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="hidden sm:inline text-xs text-content-tertiary">
          {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <KeyboardShortcuts shortcuts={shortcuts} />
      <POSShell activeScreen={activeScreen} onNavigate={setActiveScreen} topBar={topBar}>
        <ScreenComponent />
      </POSShell>
    </>
  );
};
