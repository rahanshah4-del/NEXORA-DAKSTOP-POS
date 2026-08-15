/**
 * Kitchen / KDS Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';
import type { ICreateKitchenTicketCommand, IUpdateTicketItemStatusCommand, ICompleteKitchenTicketCommand } from '../commands/IKitchenCommands';
import type { IKitchenTicketCreatedEvent, IKitchenItemReadyEvent, IKitchenTicketCompletedEvent } from '../events/IDomainEvents';

export interface IKitchenTicketCreateCommand { orderId: string; priority: string; }
export interface IKitchenTicketUpdateCommand { ticketId: string; status?: string; }

export interface IKitchenService {
  createTicket(command: ICreateKitchenTicketCommand): Promise<KitchenTicket>;
  updateItemStatus(command: IUpdateTicketItemStatusCommand): Promise<KitchenTicketItem>;
  completeTicket(command: ICompleteKitchenTicketCommand): Promise<KitchenTicket>;
  getActiveQueue(displayId?: string): Promise<KitchenTicket[]>;
  getTicket(ticketId: string): Promise<KitchenTicket | null>;
  getTicketItems(ticketId: string): Promise<KitchenTicketItem[]>;
  markAllItemsReady(ticketId: string): Promise<void>;
  getCompletedTickets(startDate: string, endDate: string): Promise<KitchenTicket[]>;
}

export interface IKitchenValidator {
  validateCreateTicket(orderId: string): import('../shared/IValidationResult').IValidationResult;
  validateItemStatusTransition(current: string, next: string): import('../shared/IValidationResult').IValidationResult;
  validateTicketCompletion(ticketId: string): import('../shared/IValidationResult').IValidationResult;
}

export interface IKitchenPolicy {
  isTicketReady(ticket: KitchenTicket): boolean;
  canBumpTicket(ticket: KitchenTicket): boolean;
  getMaxActiveTicketsPerDisplay(): number;
  getItemTimeoutMinutes(): number;
  requiresAllItemsReady(ticket: KitchenTicket): boolean;
}

export interface IKitchenFactory {
  createTicketFromOrder(orderId: string, orderNumber: number, tableName: string | null, priority: string): KitchenTicket;
  createTicketItem(ticketId: string, productId: string, productName: string, quantity: number): KitchenTicketItem;
}

export interface IKitchenEventPublisher {
  ticketCreated(event: Omit<IKitchenTicketCreatedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  itemReady(event: Omit<IKitchenItemReadyEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  ticketCompleted(event: Omit<IKitchenTicketCompletedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
