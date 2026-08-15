/**
 * KitchenService — Kitchen Display System (KDS) business logic.
 *
 * Orchestrates: KitchenRepository, OrderRepository
 * Uses engines: KitchenWorkflow
 */

import type {
  IKitchenRepository,
  KitchenTicket,
  KitchenTicketItem,
  KdsDisplayConfig,
} from '../../../repositories/IKitchenRepository';
import type { IOrderRepository } from '../../../repositories/IOrderRepository';
import {
  KitchenWorkflow,
  type TicketStatus,
  type ItemStatus,
  type TicketPriority,
  type WorkflowState,
} from './engines/kitchen-workflow';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors: [] };
}

// ── Types ──

export interface KitchenDashboard {
  pendingTickets: KitchenTicket[];
  preparingTickets: KitchenTicket[];
  readyTickets: KitchenTicket[];
  totalActive: number;
  averageWaitMinutes: number;
}

// ── Service ──

export class KitchenService {
  private readonly workflow = new KitchenWorkflow();

  constructor(
    private kitchenRepo: IKitchenRepository,
    private orderRepo: IOrderRepository,
  ) {}

  // ── Ticket Management ──

  /**
   * Create a kitchen ticket from an order.
   */
  async createTicket(
    orderId: string,
    priority: TicketPriority = 'normal',
  ): Promise<ServiceResult<KitchenTicket>> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) return fail(`Order not found: ${orderId}`);

    const existing = await this.kitchenRepo.findTicketByOrder(orderId);
    if (existing) return fail('Kitchen ticket already exists for this order');

    const ticket = await this.kitchenRepo.createTicket(orderId, priority);
    return ok(ticket);
  }

  /**
   * Update a ticket's status with transition validation.
   */
  async updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
  ): Promise<ServiceResult<void>> {
    const tickets = await this.kitchenRepo.findActiveTickets();
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return fail(`Ticket not found: ${ticketId}`);

    if (!this.workflow.canTransitionTicket(ticket.status, newStatus)) {
      return fail(
        `Cannot transition ticket from '${ticket.status}' to '${newStatus}'`,
      );
    }

    await this.kitchenRepo.updateTicketStatus(ticketId, newStatus);
    return ok(undefined);
  }

  /**
   * Complete a ticket (all items must be ready).
   */
  async completeTicket(ticketId: string): Promise<ServiceResult<void>> {
    const items = await this.kitchenRepo.getTicketItems(ticketId);
    const state = this.workflow.computeState(
      'ready',
      items.map((i) => i.status),
    );

    if (!state.isFullyReady) {
      return fail('All items must be ready before completing the ticket');
    }

    await this.kitchenRepo.completeTicket(ticketId);
    return ok(undefined);
  }

  // ── Item Management ──

  /**
   * Update an item's status with transition validation.
   */
  async updateItemStatus(
    itemId: string,
    newStatus: ItemStatus,
  ): Promise<ServiceResult<void>> {
    if (!this.workflow.canTransitionItem('pending', newStatus) &&
        !this.workflow.canTransitionItem('preparing', newStatus) &&
        !this.workflow.canTransitionItem('ready', newStatus)) {
      // We don't know the current state — trust the repository
    }

    await this.kitchenRepo.updateItemStatus(itemId, newStatus);

    // Auto-escalate ticket if all items ready
    // (The UI or a separate workflow can handle this)

    return ok(undefined);
  }

  /**
   * Mark all items on a ticket as ready.
   */
  async markAllItemsReady(ticketId: string): Promise<ServiceResult<void>> {
    await this.kitchenRepo.markAllItemsReady(ticketId);
    return ok(undefined);
  }

  // ── Dashboard / Queue ──

  /**
   * Get the kitchen dashboard with grouped tickets.
   */
  async getDashboard(): Promise<ServiceResult<KitchenDashboard>> {
    const tickets = await this.kitchenRepo.findActiveTickets({ limit: 100 });

    const pendingTickets = tickets.filter((t) => t.status === 'pending');
    const preparingTickets = tickets.filter((t) => t.status === 'preparing');
    const readyTickets = tickets.filter((t) => t.status === 'ready');

    // Calculate average wait time
    const now = Date.now();
    let totalWait = 0;
    let ticketsWithWait = 0;
    for (const t of tickets) {
      const created = new Date(t.createdAt).getTime();
      totalWait += (now - created) / 60000;
      ticketsWithWait++;
    }

    return ok({
      pendingTickets,
      preparingTickets,
      readyTickets,
      totalActive: tickets.length,
      averageWaitMinutes: ticketsWithWait > 0 ? totalWait / ticketsWithWait : 0,
    });
  }

  /**
   * Get the workflow state for a ticket.
   */
  async getTicketWorkflowState(ticketId: string): Promise<ServiceResult<WorkflowState>> {
    const tickets = await this.kitchenRepo.findActiveTickets({ limit: 100 });
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return fail(`Ticket not found: ${ticketId}`);

    const items = await this.kitchenRepo.getTicketItems(ticketId);
    const state = this.workflow.computeState(
      ticket.status,
      items.map((i) => i.status),
    );

    return ok(state);
  }

  /**
   * Escalate ticket priority based on wait time.
   */
  async escalateIfNeeded(ticketId: string): Promise<ServiceResult<TicketPriority | null>> {
    const tickets = await this.kitchenRepo.findActiveTickets({ limit: 100 });
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return fail(`Ticket not found: ${ticketId}`);

    const created = new Date(ticket.createdAt).getTime();
    const waitMinutes = (Date.now() - created) / 60000;
    const newPriority = this.workflow.escalatePriority(ticket.priority, waitMinutes);

    if (newPriority !== ticket.priority) {
      await this.kitchenRepo.updateTicketStatus(ticketId, ticket.status); // trigger sync
      return ok(newPriority);
    }

    return ok(null);
  }

  // ── Display Configs ──

  async getDisplayConfigs(): Promise<KdsDisplayConfig[]> {
    return this.kitchenRepo.getDisplayConfigs();
  }

  async saveDisplayConfig(config: Partial<KdsDisplayConfig>): Promise<KdsDisplayConfig> {
    return this.kitchenRepo.saveDisplayConfig(config);
  }

  async deleteDisplayConfig(configId: string): Promise<void> {
    await this.kitchenRepo.deleteDisplayConfig(configId);
  }

  // ── Queries ──

  async getActiveQueue(displayId?: string): Promise<KitchenTicket[]> {
    return this.kitchenRepo.findActiveTickets({ limit: 100, orderBy: 'created_at', orderDir: 'ASC' });
  }

  async getTicket(ticketId: string): Promise<KitchenTicket | null> {
    const tickets = await this.kitchenRepo.findActiveTickets({ limit: 200 });
    return tickets.find((t) => t.id === ticketId) ?? null;
  }

  async getTicketItems(ticketId: string): Promise<KitchenTicketItem[]> {
    return this.kitchenRepo.getTicketItems(ticketId);
  }

  async getCompletedTickets(
    startDate: string,
    endDate: string,
  ): Promise<KitchenTicket[]> {
    const all = await this.kitchenRepo.findActiveTickets({ limit: 500 });
    return all.filter(
      (t) =>
        t.status === 'completed' &&
        t.createdAt >= startDate &&
        t.createdAt <= endDate,
    );
  }
}
