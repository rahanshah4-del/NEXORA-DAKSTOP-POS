import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

export interface RightPanelState {
  open: boolean;
  type: string | null;
  title: string | null;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  read: boolean;
}

interface UIState {
  // Theme
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  sidebarHoverExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHoverExpanded: (expanded: boolean) => void;

  // Active route
  activeRoute: string;
  setActiveRoute: (route: string) => void;

  // Right panel
  rightPanel: RightPanelState;
  openRightPanel: (type: string, title: string) => void;
  closeRightPanel: () => void;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;

  // Global state
  globalLoading: boolean;
  globalError: string | null;
  setGlobalLoading: (loading: boolean) => void;
  setGlobalError: (error: string | null) => void;

  // Search
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
}

function resolveSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode): 'dark' | 'light' {
  const resolved = theme === 'system' ? resolveSystemTheme() : theme;

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  return resolved;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: (theme: ThemeMode) => {
        const resolved = applyTheme(theme);
        set({ theme, resolvedTheme: resolved });
      },

      // Sidebar
      sidebarCollapsed: false,
      sidebarHoverExpanded: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
      setSidebarHoverExpanded: (expanded: boolean) => set({ sidebarHoverExpanded: expanded }),

      // Active route
      activeRoute: '/',
      setActiveRoute: (route: string) => set({ activeRoute: route }),

      // Right panel
      rightPanel: { open: false, type: null, title: null },
      openRightPanel: (type: string, title: string) =>
        set({ rightPanel: { open: true, type, title } }),
      closeRightPanel: () =>
        set({ rightPanel: { open: false, type: null, title: null } }),

      // Notifications
      notifications: [],
      unreadCount: 0,
      addNotification: (notif) => {
        const item: NotificationItem = {
          ...notif,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((s) => ({
          notifications: [item, ...s.notifications].slice(0, 50),
          unreadCount: s.unreadCount + 1,
        }));
      },
      markNotificationRead: (id: string) =>
        set((s) => {
          const notifications = s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          );
          return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
        }),
      markAllNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      clearNotifications: () => set({ notifications: [], unreadCount: 0 }),

      // Global state
      globalLoading: false,
      globalError: null,
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),
      setGlobalError: (error: string | null) => set({ globalError: error }),

      // Search
      globalSearchOpen: false,
      setGlobalSearchOpen: (open: boolean) => set({ globalSearchOpen: open }),
    }),
    {
      name: 'nexora-ui-store',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = applyTheme(state.theme);
          state.resolvedTheme = resolved;
        }
      },
    },
  ),
);
