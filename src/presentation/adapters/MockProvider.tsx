/**
 * MockProvider.tsx — Lightweight presentation context provider.
 *
 * Wraps the app WITHOUT requiring a database, DI container, or IPC layer.
 * All state lives in existing Zustand stores.
 *
 * Phase 18 will replace this with the real ApplicationProvider that connects to SQLite.
 *
 * Usage:
 *   <MockProvider>
 *     <POSRouter />
 *   </MockProvider>
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

// ── Mock Application Context ──

export interface MockAppContextValue {
  deviceId: string;
  workspaceId: string;
  branchId: string;
  currentUser: { id: string; name: string; role: string } | null;
  isOnline: boolean;
  setOnline: (v: boolean) => void;
}

const MockAppContext = createContext<MockAppContextValue | null>(null);

export function useMockAppContext(): MockAppContextValue {
  const ctx = useContext(MockAppContext);
  if (!ctx) throw new Error('useMockAppContext must be used within <MockProvider>');
  return ctx;
}

// ── Provider ──

interface MockProviderProps {
  children: ReactNode;
  deviceId?: string;
  workspaceId?: string;
  branchId?: string;
}

export const MockProvider: React.FC<MockProviderProps> = ({
  children,
  deviceId = 'pos-terminal-1',
  workspaceId = 'default',
  branchId = 'main',
}) => {
  const [isOnline, setOnline] = useState(true);

  const value: MockAppContextValue = useMemo(() => ({
    deviceId,
    workspaceId,
    branchId,
    currentUser: { id: 'user-1', name: 'Operator', role: 'cashier' },
    isOnline,
    setOnline,
  }), [deviceId, workspaceId, branchId, isOnline]);

  return (
    <MockAppContext.Provider value={value}>
      {children}
    </MockAppContext.Provider>
  );
};
