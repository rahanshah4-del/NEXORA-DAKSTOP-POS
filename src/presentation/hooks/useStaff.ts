/**
 * useStaff.ts — Staff/Employee hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess } from '@/stores/toast-store';
import type { Employee, Shift } from '../../types/models';

export function useStaff() {
  const createEmployee = useCommand<Employee>('ICreateEmployeeCommand');
  const updateEmployee = useCommand<Employee>('IUpdateEmployeeCommand');
  const deactivateEmployee = useCommand<void>('IDeactivateEmployeeCommand');
  const clockIn = useCommand<Shift>('IClockInCommand');
  const clockOut = useCommand<Shift>('IClockOutCommand');
  const staffQuery = useQuery<Employee>('IGetStaffQuery', { autoFetch: false });
  const activeShiftsQuery = useQuery<Shift>('IGetActiveShiftsQuery', { autoFetch: false });

  const fetchStaff = useCallback(async () => staffQuery.refetch(), [staffQuery]);

  return {
    createEmployee: createEmployee.execute, updateEmployee: updateEmployee.execute,
    deactivateEmployee: deactivateEmployee.execute,
    clockIn: async (input: any) => { const r = await clockIn.execute(input); if (r.isSuccess) notifySuccess('Clocked In', ''); return r; },
    clockOut: async (input: any) => { const r = await clockOut.execute(input); if (r.isSuccess) notifySuccess('Clocked Out', ''); return r; },
    employees: (staffQuery.data?.items ?? []) as Employee[],
    activeShifts: (activeShiftsQuery.data?.items ?? []) as Shift[],
    isLoading: staffQuery.isLoading,
    refetchStaff: fetchStaff, refetchShifts: activeShiftsQuery.refetch,
    searchEmployees: async (q: string) => [], getActiveEmployees: async () => [],
    getActiveShifts: async () => [],
    searchResults: [],
  };
}
