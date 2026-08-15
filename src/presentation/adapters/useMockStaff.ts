/**
 * useMockStaff.ts — Staff/Employee hook backed by local React state.
 */

import { useState, useCallback, useMemo } from 'react';
import { notifySuccess, notifyError } from '@/stores/toast-store';

interface MockEmployee {
  id: string; firstName: string; lastName: string; email: string | null;
  phone: string | null; role: string; hourlyRateCents: number | null;
  isActive: boolean; hireDate: string | null; createdAt: string; updatedAt: string;
}
interface MockShift {
  id: string; employeeId: string; employeeName: string | null;
  clockIn: string; clockOut: string | null; totalMinutes: number | null;
  notes: string | null; createdAt: string;
}

const DEFAULT_EMPLOYEES: MockEmployee[] = [
  { id: 'e1', firstName: 'Raj', lastName: 'Kumar', email: 'raj@nexora.com', phone: null, role: 'chef', hourlyRateCents: 2500, isActive: true, hireDate: '2025-01-15', createdAt: '', updatedAt: '' },
  { id: 'e2', firstName: 'Meera', lastName: 'Shah', email: null, phone: '9876543210', role: 'waiter', hourlyRateCents: 1200, isActive: true, hireDate: '2025-06-01', createdAt: '', updatedAt: '' },
  { id: 'e3', firstName: 'Arun', lastName: 'Nair', email: 'arun@nexora.com', phone: null, role: 'cashier', hourlyRateCents: 1500, isActive: true, hireDate: '2024-03-10', createdAt: '', updatedAt: '' },
  { id: 'e4', firstName: 'Deepa', lastName: 'Iyer', email: null, phone: null, role: 'manager', hourlyRateCents: 4000, isActive: true, hireDate: '2023-11-01', createdAt: '', updatedAt: '' },
  { id: 'e5', firstName: 'Sohan', lastName: 'Lal', email: null, phone: null, role: 'staff', hourlyRateCents: 1000, isActive: false, hireDate: '2025-02-20', createdAt: '', updatedAt: '' },
];

export function useMockStaff() {
  const [employees, setEmployees] = useState<MockEmployee[]>(DEFAULT_EMPLOYEES);
  const [activeShifts, setActiveShifts] = useState<MockShift[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refetchStaff = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 150));
    setIsLoading(false);
  }, []);

  const refetchShifts = useCallback(async () => { /* local */ }, []);

  const clockIn = useCallback(async (input: any) => {
    const emp = employees.find(e => e.id === input.employeeId);
    if (!emp) return { success: false, error: 'Employee not found' };
    const shift: MockShift = {
      id: `shift_${Date.now()}`, employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      clockIn: new Date().toISOString(), clockOut: null, totalMinutes: null,
      notes: input.notes ?? null, createdAt: new Date().toISOString(),
    };
    setActiveShifts(prev => [...prev, shift]);
    notifySuccess('Clocked In', `${emp.firstName} ${emp.lastName}`);
    return { success: true, data: shift };
  }, [employees]);

  const clockOut = useCallback(async (input: any) => {
    const now = new Date().toISOString();
    setActiveShifts(prev => prev.map(s => {
      if (s.id !== input.shiftId) return s;
      const clockOut = now;
      const totalMinutes = Math.round((new Date(now).getTime() - new Date(s.clockIn).getTime()) / 60000);
      return { ...s, clockOut, totalMinutes, notes: input.notes ?? s.notes };
    }));
    notifySuccess('Clocked Out', 'Shift ended');
    return { success: true };
  }, []);

  const createEmployee = useCallback(async (input: any) => {
    const emp: MockEmployee = {
      id: `e${Date.now()}`, firstName: input.firstName, lastName: input.lastName,
      email: input.email ?? null, phone: input.phone ?? null,
      role: input.role ?? 'staff', hourlyRateCents: input.hourlyRateCents ?? null,
      isActive: true, hireDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    setEmployees(prev => [...prev, emp]);
    notifySuccess('Added', `${emp.firstName} ${emp.lastName} added`);
    return { success: true, data: emp };
  }, []);

  return {
    employees, activeShifts,
    clockIn, clockOut, createEmployee,
    updateEmployee: async () => ({ success: true }),
    deactivateEmployee: async () => { notifySuccess('Deactivated', ''); return { success: true }; },
    reactivateEmployee: async () => ({ success: true }),
    refetchStaff, refetchShifts,
    searchEmployees: async (q: string) => employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase())),
    getByRole: async (role: string) => employees.filter(e => e.role === role),
    getActiveEmployees: async () => employees.filter(e => e.isActive),
    getActiveShifts: async () => activeShifts,
    isLoading, searchResults: [],
  };
}
