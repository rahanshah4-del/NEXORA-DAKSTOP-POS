/**
 * IStaffRepository — repository interface for Staff (Employees & Shifts).
 * Interface only. No implementation.
 */

import type { Employee, Shift } from '../types/models';
import type { UserRole } from '../types/enums';
import type { ISyncRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Staff Repository Interface ──

export interface IStaffRepository extends ISyncRepository<Employee> {
  /** Search employees by name or email */
  search(query: string, opts?: QueryOptions): Promise<Employee[]>;

  /** Find employees by role */
  findByRole(role: UserRole): Promise<Employee[]>;

  /** Find active employees only */
  findActive(): Promise<Employee[]>;

  /** Find employee by user ID */
  findByUserId(userId: string): Promise<Employee | null>;

  /** Toggle employee active status */
  setActive(id: string, isActive: boolean): Promise<void>;

  /** Update employee role */
  updateRole(id: string, role: UserRole): Promise<void>;

  /** Update hourly rate */
  updateHourlyRate(id: string, rateCents: number): Promise<void>;

  // ── Shifts ──

  /** Clock in an employee */
  clockIn(employeeId: string, notes?: string): Promise<Shift>;

  /** Clock out an employee */
  clockOut(shiftId: string, notes?: string): Promise<Shift>;

  /** Get the active shift for an employee */
  getActiveShift(employeeId: string): Promise<Shift | null>;

  /** Get shifts for an employee */
  getShifts(employeeId: string, opts?: QueryOptions): Promise<Shift[]>;

  /** Get all active shifts (currently clocked in) */
  getActiveShifts(): Promise<Shift[]>;

  /** Get shifts within a date range */
  getShiftsByDateRange(startDate: string, endDate: string): Promise<Shift[]>;
}
