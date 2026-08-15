/**
 * Shift / Staff Command Interfaces.
 * CQRS commands for Staff and Shift aggregates.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';
import type { UserRole } from '../../types/enums';

export interface ICreateEmployeeCommand extends ICommand {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  hourlyRateCents: number | null;
  hireDate: string | null;
}

export interface IUpdateEmployeeCommand extends ICommand {
  employeeId: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  role?: UserRole;
  hourlyRateCents?: number | null;
}

export interface IDeactivateEmployeeCommand extends ICommand {
  employeeId: string;
  reason: string;
}

export interface IReactivateEmployeeCommand extends ICommand {
  employeeId: string;
}

export interface IClockInCommand extends ICommand {
  employeeId: string;
  notes: string | null;
}

export interface IClockOutCommand extends ICommand {
  shiftId: string;
  notes: string | null;
}

export interface ICloseShiftCommand extends ICommand {
  shiftId: string;
  cashCountCents: number | null;
  notes: string | null;
}

export interface IOpenDrawerCommand extends ICommand {
  employeeId: string;
  reason: string;
}

export interface ICloseDrawerCommand extends ICommand {
  employeeId: string;
  cashCountCents: number;
  notes: string | null;
}
