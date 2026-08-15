/**
 * useMockTables.ts — Table hook backed by local React state.
 */

import { useState, useCallback, useMemo } from 'react';
import { notifySuccess } from '@/stores/toast-store';
import { TableViewModel, type TableViewData } from '../viewModels/TableViewModel';

interface MockTable {
  id: string; name: string; section: string | null; capacity: number;
  status: string; positionX: number | null; positionY: number | null;
  currentOrderId: string | null; createdAt: string; updatedAt: string;
}

const DEFAULT_TABLES: MockTable[] = [
  { id: 't1', name: 'T1', section: 'Main', capacity: 4, status: 'available', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
  { id: 't2', name: 'T2', section: 'Main', capacity: 2, status: 'occupied', positionX: 0, positionY: 0, currentOrderId: 'ord_1', createdAt: '', updatedAt: '' },
  { id: 't3', name: 'T3', section: 'Main', capacity: 6, status: 'available', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
  { id: 't4', name: 'T4', section: 'Patio', capacity: 4, status: 'available', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
  { id: 't5', name: 'T5', section: 'Patio', capacity: 8, status: 'occupied', positionX: 0, positionY: 0, currentOrderId: 'ord_2', createdAt: '', updatedAt: '' },
  { id: 't6', name: 'T6', section: 'Bar', capacity: 2, status: 'reserved', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
  { id: 't7', name: 'T7', section: 'Main', capacity: 4, status: 'cleaning', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
  { id: 't8', name: 'T8', section: 'Private', capacity: 10, status: 'available', positionX: 0, positionY: 0, currentOrderId: null, createdAt: '', updatedAt: '' },
];

export function useMockTables() {
  const [tables, setTables] = useState<MockTable[]>(DEFAULT_TABLES);
  const [isLoading, setIsLoading] = useState(false);

  const tableViews = useMemo(() =>
    TableViewModel.toViewDataList(tables as any),
  [tables]);

  const availableTables = useMemo(() =>
    tableViews.filter(t => t.isAvailable),
  [tableViews]);

  const refetchTables = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 150));
    setIsLoading(false);
  }, []);

  const updateStatus = useCallback(async (input: any) => {
    setTables(prev => prev.map(t =>
      t.id === input.tableId ? { ...t, status: input.status } : t));
    notifySuccess('Table Updated', `Status changed`);
    return { success: true };
  }, []);

  return {
    tables: tableViews,
    availableTables,
    updateStatus,
    refetchTables,
    isLoading,
    updateTable: async () => ({ success: true }),
    assignOrder: async () => ({ success: true }),
    clearOrder: async () => ({ success: true }),
  };
}
