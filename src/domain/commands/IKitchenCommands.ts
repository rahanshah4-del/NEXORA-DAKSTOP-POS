/**
 * Kitchen Command Interfaces.
 * CQRS commands for the Kitchen / KDS aggregate.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';

export interface ICreateKitchenTicketCommand extends ICommand {
  orderId: string;
  priority: 'normal' | 'rush' | 'high';
}

export interface IUpdateTicketItemStatusCommand extends ICommand {
  ticketId: string;
  itemId: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
}

export interface ICompleteKitchenTicketCommand extends ICommand {
  ticketId: string;
}

export interface IMarkItemReadyCommand extends ICommand {
  ticketId: string;
  itemId: string;
}

export interface IBumpTicketCommand extends ICommand {
  ticketId: string;
}

export interface IAssignKdsDisplayCommand extends ICommand {
  displayId: string;
  categoryIds: string[];
}
