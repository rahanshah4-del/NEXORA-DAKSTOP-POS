/**
 * Kitchen / KDS Query Interfaces.
 * CQRS queries for reading kitchen display data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';
import type { KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';

export interface IGetKitchenQueueQuery extends IQuery<KitchenTicket> {
  displayId?: string;
  status?: string;
}

export interface IGetKitchenTicketQuery extends IQuery<KitchenTicket> {
  ticketId: string;
}

export interface IGetActiveTicketsQuery extends IQuery<KitchenTicket> {
  priority?: 'normal' | 'rush' | 'high';
}

export interface IGetTicketItemsQuery extends IQuery<KitchenTicketItem> {
  ticketId: string;
}

export interface IGetCompletedTicketsQuery extends IQuery<KitchenTicket> {
  startDate: string;
  endDate: string;
}

export interface IGetKdsConfigQuery {
  displayId?: string;
}
