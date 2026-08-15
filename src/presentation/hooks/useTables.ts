/**
 * useTables.ts — Table-specific hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifyInfo } from '@/stores/toast-store';
import { TableViewModel, type TableViewData } from '../viewModels/TableViewModel';
import type { Table } from '../../types/models';

export function useTables() {
  const updateTableStatus = useCommand<void>('IUpdateTableStatusCommand');
  const openTable = useCommand<Table>('IOpenTableCommand');
  const closeTable = useCommand<Table>('ICloseTableCommand');
  const tablesQuery = useQuery<Table>('IGetTablesQuery', { autoFetch: false });

  const fetchTables = useCallback(async () => tablesQuery.refetch(), [tablesQuery]);

  const tableViews = TableViewModel.toViewDataList((tablesQuery.data?.items as Table[]) ?? []);

  return {
    updateStatus: updateTableStatus.execute, openTable: openTable.execute,
    closeTable: closeTable.execute,
    tables: tableViews,
    availableTables: tableViews.filter((t: any) => t.isAvailable),
    occupiedTables: tableViews.filter((t: any) => !t.isAvailable),
    isLoading: tablesQuery.isLoading,
    refetchTables: fetchTables,
  };
}
