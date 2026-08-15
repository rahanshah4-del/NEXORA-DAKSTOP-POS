/**
 * StaffCommandHandlers.ts — Command handlers for Staff/Employee/Shift commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { IStaffRepository } from '../../repositories/IStaffRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { Employee, Shift } from '../../types/models';
import type { UserRole } from '../../types/enums';

export class StaffCommandHandlers {
  constructor(
    private _staffRepo: IStaffRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async createEmployee(command: any, ctx: IApplicationContext): Promise<Result<Employee>> {
    const employee = await this._staffRepo.create({
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email ?? null,
      phone: command.phone ?? null,
      role: (command.role ?? 'staff') as UserRole,
      hourlyRateCents: command.hourlyRateCents ?? null,
      hireDate: command.hireDate ?? null,
      isActive: true,
    } as Partial<Employee>);

    this._events.publish('employee.created', { employeeId: employee.id });
    this._logger.info(`Employee created: ${employee.firstName} ${employee.lastName}`, { employeeId: employee.id });
    return Result.ok(employee);
  }

  async updateEmployee(command: any, ctx: IApplicationContext): Promise<Result<Employee>> {
    const existing = await this._staffRepo.findById(command.employeeId);
    if (!existing) return Result.notFound('Employee', command.employeeId);

    const updates: Partial<Employee> = {};
    if (command.firstName !== undefined) updates.firstName = command.firstName;
    if (command.lastName !== undefined) updates.lastName = command.lastName;
    if (command.email !== undefined) updates.email = command.email;
    if (command.phone !== undefined) updates.phone = command.phone;
    if (command.role !== undefined) updates.role = command.role;
    if (command.hourlyRateCents !== undefined) updates.hourlyRateCents = command.hourlyRateCents;
    if (command.hireDate !== undefined) updates.hireDate = command.hireDate;

    const employee = await this._staffRepo.update(command.employeeId, updates);
    return Result.ok(employee);
  }

  async deactivateEmployee(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._staffRepo.setActive(command.employeeId, false);
    this._events.publish('employee.deactivated', { employeeId: command.employeeId, reason: command.reason });
    return Result.success();
  }

  async reactivateEmployee(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._staffRepo.setActive(command.employeeId, true);
    return Result.success();
  }

  async clockIn(command: any, ctx: IApplicationContext): Promise<Result<Shift>> {
    const employee = await this._staffRepo.findById(command.employeeId);
    if (!employee) return Result.notFound('Employee', command.employeeId);
    if (!employee.isActive) return Result.businessRuleViolation('Employee is deactivated');

    const activeShift = await this._staffRepo.getActiveShift(command.employeeId);
    if (activeShift) return Result.conflict('Employee already has an active shift');

    const shift = await this._staffRepo.clockIn(command.employeeId, command.notes);
    this._events.publish('shift.started', { shiftId: shift.id, employeeId: command.employeeId });
    this._logger.info(`Employee clocked in: ${employee.firstName} ${employee.lastName}`, { shiftId: shift.id });
    return Result.ok(shift);
  }

  async clockOut(command: any, ctx: IApplicationContext): Promise<Result<Shift>> {
    const shift = await this._staffRepo.clockOut(command.shiftId, command.notes);
    this._events.publish('shift.closed', { shiftId: command.shiftId });
    return Result.ok(shift);
  }

  async closeShift(command: any, ctx: IApplicationContext): Promise<Result<Shift>> {
    const shift = await this._staffRepo.clockOut(command.shiftId, command.notes);
    this._events.publish('shift.closed', {
      shiftId: command.shiftId,
      cashCountCents: command.cashCountCents,
    });
    return Result.ok(shift);
  }

  async openDrawer(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._events.publish('drawer.opened', { employeeId: command.employeeId, reason: command.reason });
    return Result.success();
  }

  async closeDrawer(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._events.publish('drawer.closed', {
      employeeId: command.employeeId,
      cashCountCents: command.cashCountCents,
    });
    return Result.success();
  }
}
