/**
 * Staff & Shift Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { Employee, Shift } from '../../types/models';
import type { UserRole } from '../../types/enums';
import type { IFactoryContext } from '../shared/IDomainFactory';
import type { ICreateEmployeeCommand, IUpdateEmployeeCommand, IClockInCommand, IClockOutCommand, ICloseShiftCommand } from '../commands/IShiftCommands';
import type { IShiftStartedEvent, IShiftClosedEvent, IEmployeeCreatedEvent, IEmployeeDeactivatedEvent } from '../events/IDomainEvents';

export interface IStaffService {
  createEmployee(command: ICreateEmployeeCommand): Promise<Employee>;
  updateEmployee(command: IUpdateEmployeeCommand): Promise<Employee>;
  deactivateEmployee(employeeId: string, reason: string): Promise<Employee>;
  reactivateEmployee(employeeId: string): Promise<Employee>;
  findById(employeeId: string): Promise<Employee | null>;
  findByRole(role: UserRole): Promise<Employee[]>;
  findActive(): Promise<Employee[]>;
  search(query: string): Promise<Employee[]>;
  clockIn(command: IClockInCommand): Promise<Shift>;
  clockOut(command: IClockOutCommand): Promise<Shift>;
  closeShift(command: ICloseShiftCommand): Promise<Shift>;
  getActiveShift(employeeId: string): Promise<Shift | null>;
  getActiveShifts(): Promise<Shift[]>;
  getShiftHistory(employeeId: string, startDate: string, endDate: string): Promise<Shift[]>;
}

export interface IStaffValidator {
  validateCreate(command: ICreateEmployeeCommand): import('../shared/IValidationResult').IValidationResult;
  validateUpdate(command: IUpdateEmployeeCommand, existing: Employee): import('../shared/IValidationResult').IValidationResult;
  validateClockIn(command: IClockInCommand): import('../shared/IValidationResult').IValidationResult;
  validateClockOut(command: IClockOutCommand, existing: Shift): import('../shared/IValidationResult').IValidationResult;
  validateCloseShift(command: ICloseShiftCommand, existing: Shift): import('../shared/IValidationResult').IValidationResult;
  validateRole(role: UserRole): import('../shared/IValidationResult').IValidationResult;
}

export interface IStaffPolicy {
  canClockIn(employee: Employee): boolean;
  canClockOut(shift: Shift): boolean;
  maxShiftDurationHours(): number;
  minBreakDurationMinutes(): number;
  requiresManagerForRoleChange(): boolean;
  getOvertimeThresholdHours(): number;
}

export interface IStaffFactory {
  createEmployee(command: ICreateEmployeeCommand, context: IFactoryContext): Employee;
  createShift(employee: Employee, clockIn: string): Shift;
}

export interface IStaffEventPublisher {
  shiftStarted(event: Omit<IShiftStartedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  shiftClosed(event: Omit<IShiftClosedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  employeeCreated(event: Omit<IEmployeeCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  employeeDeactivated(event: Omit<IEmployeeDeactivatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
