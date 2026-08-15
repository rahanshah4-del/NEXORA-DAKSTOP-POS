/**
 * StaffService — Restaurant employee and shift management logic.
 *
 * Orchestrates: StaffRepository
 * No engines used (staff is administrative, not transactional).
 */

import type { Employee, Shift } from '../../../types/models';
import type { UserRole } from '../../../types/enums';
import type { IStaffRepository } from '../../../repositories/IStaffRepository';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors: [] };
}

// ── Types ──

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  hourlyRateCents?: number | null;
  hireDate?: string | null;
}

export interface UpdateEmployeeInput {
  employeeId: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
  hourlyRateCents?: number | null;
  hireDate?: string | null;
}

export interface StaffSummary {
  totalEmployees: number;
  activeEmployees: number;
  clockedInCount: number;
  byRole: Record<string, number>;
}

// ── Service ──

export class StaffService {
  constructor(private staffRepo: IStaffRepository) {}

  // ── Employee CRUD ──

  async createEmployee(input: CreateEmployeeInput): Promise<ServiceResult<Employee>> {
    const errors: string[] = [];
    if (!input.firstName?.trim()) errors.push('First name is required');
    if (!input.lastName?.trim()) errors.push('Last name is required');
    if (errors.length > 0) return fail('Validation failed');

    const employee = await this.staffRepo.create({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      role: input.role,
      hourlyRateCents: input.hourlyRateCents ?? null,
      hireDate: input.hireDate ?? new Date().toISOString().split('T')[0],
      isActive: true,
    } as Partial<Employee>);

    return ok(employee);
  }

  async updateEmployee(input: UpdateEmployeeInput): Promise<ServiceResult<Employee>> {
    const existing = await this.staffRepo.findById(input.employeeId);
    if (!existing) return fail(`Employee not found: ${input.employeeId}`);

    const updates: Partial<Employee> = {};
    if (input.firstName !== undefined) updates.firstName = input.firstName;
    if (input.lastName !== undefined) updates.lastName = input.lastName;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.role !== undefined) updates.role = input.role;
    if (input.hourlyRateCents !== undefined) updates.hourlyRateCents = input.hourlyRateCents;
    if (input.hireDate !== undefined) updates.hireDate = input.hireDate;

    const employee = await this.staffRepo.update(input.employeeId, updates);
    return ok(employee);
  }

  async deactivateEmployee(employeeId: string, reason?: string): Promise<ServiceResult<void>> {
    const existing = await this.staffRepo.findById(employeeId);
    if (!existing) return fail(`Employee not found: ${employeeId}`);

    // Check no active shift
    const activeShift = await this.staffRepo.getActiveShift(employeeId);
    if (activeShift) {
      return fail('Cannot deactivate employee with an active shift');
    }

    await this.staffRepo.setActive(employeeId, false);
    return ok(undefined);
  }

  async reactivateEmployee(employeeId: string): Promise<ServiceResult<void>> {
    await this.staffRepo.setActive(employeeId, true);
    return ok(undefined);
  }

  async updateRole(employeeId: string, role: UserRole): Promise<ServiceResult<void>> {
    await this.staffRepo.updateRole(employeeId, role);
    return ok(undefined);
  }

  async updateHourlyRate(employeeId: string, rateCents: number): Promise<ServiceResult<void>> {
    if (rateCents < 0) return fail('Hourly rate must be non-negative');
    await this.staffRepo.updateHourlyRate(employeeId, rateCents);
    return ok(undefined);
  }

  // ── Shifts ──

  async clockIn(employeeId: string, notes?: string): Promise<ServiceResult<Shift>> {
    const employee = await this.staffRepo.findById(employeeId);
    if (!employee) return fail(`Employee not found: ${employeeId}`);
    if (!employee.isActive) return fail('Employee is deactivated');

    const existingShift = await this.staffRepo.getActiveShift(employeeId);
    if (existingShift) return fail('Employee already has an active shift');

    const shift = await this.staffRepo.clockIn(employeeId, notes);
    return ok(shift);
  }

  async clockOut(shiftId: string, notes?: string): Promise<ServiceResult<Shift>> {
    const shift = await this.staffRepo.clockOut(shiftId, notes);
    return ok(shift);
  }

  async getActiveShift(employeeId: string): Promise<Shift | null> {
    return this.staffRepo.getActiveShift(employeeId);
  }

  async getActiveShifts(): Promise<Shift[]> {
    return this.staffRepo.getActiveShifts();
  }

  async getShiftHistory(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<Shift[]> {
    return this.staffRepo.getShiftsByDateRange(startDate, endDate);
  }

  /**
   * Calculate total hours worked for a shift.
   */
  calculateShiftHours(shift: Shift): number {
    if (!shift.clockOut || !shift.totalMinutes) return 0;
    return shift.totalMinutes / 60;
  }

  /**
   * Calculate earnings for a shift.
   */
  calculateShiftEarnings(
    shift: Shift,
    hourlyRateCents: number,
  ): number {
    if (!shift.totalMinutes) return 0;
    return Math.round((shift.totalMinutes / 60) * hourlyRateCents);
  }

  // ── Queries ──

  async searchEmployees(query: string): Promise<Employee[]> {
    return this.staffRepo.search(query);
  }

  async getByRole(role: UserRole): Promise<Employee[]> {
    return this.staffRepo.findByRole(role);
  }

  async getActiveEmployees(): Promise<Employee[]> {
    return this.staffRepo.findActive();
  }

  async getStaffSummary(): Promise<StaffSummary> {
    const all = await this.staffRepo.findAll();
    const active = all.filter((e) => e.isActive);
    const activeShifts = await this.staffRepo.getActiveShifts();

    const byRole: Record<string, number> = {};
    for (const e of all) {
      byRole[e.role] = (byRole[e.role] ?? 0) + 1;
    }

    return {
      totalEmployees: all.length,
      activeEmployees: active.length,
      clockedInCount: activeShifts.length,
      byRole,
    };
  }
}
