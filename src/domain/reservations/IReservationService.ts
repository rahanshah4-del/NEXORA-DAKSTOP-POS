/**
 * Reservation Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { ICreateReservationCommand, IUpdateReservationCommand, ICancelReservationCommand, ISeatReservationCommand } from '../commands/IMiscCommands';
import type { IReservationCreatedEvent, IReservationSeatedEvent } from '../events/IDomainEvents';

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  tableId: string | null;
  status: 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReservationService {
  create(command: ICreateReservationCommand): Promise<Reservation>;
  update(command: IUpdateReservationCommand): Promise<Reservation>;
  cancel(command: ICancelReservationCommand): Promise<Reservation>;
  seat(command: ISeatReservationCommand): Promise<Reservation>;
  findById(id: string): Promise<Reservation | null>;
  getByDate(date: string): Promise<Reservation[]>;
  getUpcoming(limit: number): Promise<Reservation[]>;
  getByTable(tableId: string, date: string): Promise<Reservation[]>;
  markNoShow(reservationId: string): Promise<Reservation>;
}

export interface IReservationValidator {
  validateCreate(command: ICreateReservationCommand): import('../shared/IValidationResult').IValidationResult;
  validateUpdate(command: IUpdateReservationCommand): import('../shared/IValidationResult').IValidationResult;
  validateCancel(command: ICancelReservationCommand): import('../shared/IValidationResult').IValidationResult;
  validateSeat(command: ISeatReservationCommand): import('../shared/IValidationResult').IValidationResult;
  validatePartySize(size: number): import('../shared/IValidationResult').IValidationResult;
  validateTimeSlot(date: string, time: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IReservationPolicy {
  maxPartySize(): number;
  minAdvanceBookingMinutes(): number;
  maxAdvanceBookingDays(): number;
  allowOverbooking(): boolean;
  overbookingPercent(): number;
  reservationHoldMinutes(): number;
  noShowGraceMinutes(): number;
}

export interface IReservationFactory {
  create(command: ICreateReservationCommand): Reservation;
}

export interface IReservationEventPublisher {
  reservationCreated(event: Omit<IReservationCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  reservationSeated(event: Omit<IReservationSeatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
