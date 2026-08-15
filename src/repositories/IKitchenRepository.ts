/**
 * IKitchenRepository — repository interface for Kitchen (KDS).
 * Interface only. No implementation.
 */

import type { IRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Kitchen Ticket ──

export interface KitchenTicket {
  id: string;
  orderId: string;
  orderNumber: number;
  tableName: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  priority: 'normal' | 'rush' | 'high';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Kitchen Ticket Item ──

export interface KitchenTicketItem {
  id: string;
  ticketId: string;
  productId: string;
  productName: string;
  quantity: number;
  notes: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// ── Kitchen KDS Display Config ──

export interface KdsDisplayConfig {
  id: string;
  name: string;
  categoryIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Kitchen Repository Interface ──

export interface IKitchenRepository {
  // ── Tickets ──

  /** Create a kitchen ticket from an order */
  createTicket(orderId: string, priority?: string): Promise<KitchenTicket>;

  /** Find a ticket by order ID */
  findTicketByOrder(orderId: string): Promise<KitchenTicket | null>;

  /** Find all active (non-completed) tickets */
  findActiveTickets(opts?: QueryOptions): Promise<KitchenTicket[]>;

  /** Update ticket status */
  updateTicketStatus(ticketId: string, status: KitchenTicket['status']): Promise<void>;

  /** Mark a ticket as complete */
  completeTicket(ticketId: string): Promise<void>;

  // ── Ticket Items ──

  /** Get items for a ticket */
  getTicketItems(ticketId: string): Promise<KitchenTicketItem[]>;

  /** Update an item's status */
  updateItemStatus(itemId: string, status: KitchenTicketItem['status']): Promise<void>;

  /** Mark all items as ready */
  markAllItemsReady(ticketId: string): Promise<void>;

  // ── Display Configs ──

  /** Get all KDS display configurations */
  getDisplayConfigs(): Promise<KdsDisplayConfig[]>;

  /** Save a KDS display configuration */
  saveDisplayConfig(config: Partial<KdsDisplayConfig>): Promise<KdsDisplayConfig>;

  /** Delete a KDS display configuration */
  deleteDisplayConfig(configId: string): Promise<void>;
}
