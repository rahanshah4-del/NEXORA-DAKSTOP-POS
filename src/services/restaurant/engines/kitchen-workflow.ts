/**
 * KitchenWorkflow — Kitchen ticket lifecycle and status transition logic.
 *
 * Manages:
 *   - Valid status transitions for tickets and items
 *   - Priority escalation rules
 *   - Ticket readiness determination
 *   - Timeout/threshold calculations
 */

// ── Types ──

export type TicketStatus = 'pending' | 'preparing' | 'ready' | 'completed';
export type TicketPriority = 'normal' | 'rush' | 'high';
export type ItemStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface StatusTransition {
  from: TicketStatus | ItemStatus;
  to: TicketStatus | ItemStatus;
  allowed: boolean;
  requiresAllItems?: boolean;
}

export interface WorkflowState {
  ticketStatus: TicketStatus;
  totalItems: number;
  pendingItems: number;
  preparingItems: number;
  readyItems: number;
  completedItems: number;
  isFullyReady: boolean;
  canComplete: boolean;
}

// ── Valid Transitions ──

const TICKET_TRANSITIONS: StatusTransition[] = [
  { from: 'pending', to: 'preparing', allowed: true },
  { from: 'pending', to: 'ready', allowed: true },
  { from: 'pending', to: 'completed', allowed: true },
  { from: 'preparing', to: 'ready', allowed: true },
  { from: 'preparing', to: 'completed', allowed: true },
  { from: 'ready', to: 'completed', allowed: true },
  { from: 'completed', to: 'pending', allowed: false },
  { from: 'completed', to: 'preparing', allowed: false },
  { from: 'completed', to: 'ready', allowed: false },
];

const ITEM_TRANSITIONS: StatusTransition[] = [
  { from: 'pending', to: 'preparing', allowed: true },
  { from: 'pending', to: 'ready', allowed: true },
  { from: 'preparing', to: 'ready', allowed: true },
  { from: 'ready', to: 'completed', allowed: true },
  { from: 'completed', to: 'pending', allowed: false },
  { from: 'completed', to: 'preparing', allowed: false },
  { from: 'completed', to: 'ready', allowed: false },
];

// ── Engine ──

export class KitchenWorkflow {
  /**
   * Check if a ticket status transition is allowed.
   */
  canTransitionTicket(from: TicketStatus, to: TicketStatus): boolean {
    const transition = TICKET_TRANSITIONS.find((t) => t.from === from && t.to === to);
    return transition?.allowed ?? false;
  }

  /**
   * Check if an item status transition is allowed.
   */
  canTransitionItem(from: ItemStatus, to: ItemStatus): boolean {
    const transition = ITEM_TRANSITIONS.find((t) => t.from === from && t.to === to);
    return transition?.allowed ?? false;
  }

  /**
   * Compute the current workflow state from item statuses.
   */
  computeState(
    ticketStatus: TicketStatus,
    itemStatuses: ItemStatus[],
  ): WorkflowState {
    const totalItems = itemStatuses.length;
    const pendingItems = itemStatuses.filter((s) => s === 'pending').length;
    const preparingItems = itemStatuses.filter((s) => s === 'preparing').length;
    const readyItems = itemStatuses.filter((s) => s === 'ready').length;
    const completedItems = itemStatuses.filter((s) => s === 'completed').length;

    const isFullyReady = totalItems > 0 && readyItems + completedItems === totalItems;
    const canComplete = isFullyReady && ticketStatus !== 'completed';

    return {
      ticketStatus,
      totalItems,
      pendingItems,
      preparingItems,
      readyItems,
      completedItems,
      isFullyReady,
      canComplete,
    };
  }

  /**
   * Determine the suggested next status for a ticket based on item progress.
   */
  suggestNextTicketStatus(state: WorkflowState): TicketStatus | null {
    if (state.canComplete) return 'completed';
    if (state.preparingItems > 0 && state.ticketStatus === 'pending') return 'preparing';
    if (state.readyItems > 0 && state.ticketStatus === 'pending') return 'ready';
    return null;
  }

  /**
   * Escalate priority based on wait time.
   */
  escalatePriority(
    currentPriority: TicketPriority,
    waitTimeMinutes: number,
  ): TicketPriority {
    if (waitTimeMinutes > 30 && currentPriority === 'normal') return 'rush';
    if (waitTimeMinutes > 20 && currentPriority === 'rush') return 'high';
    return currentPriority;
  }

  /**
   * Get the recommended item timeout in minutes based on priority.
   */
  getItemTimeout(priority: TicketPriority): number {
    switch (priority) {
      case 'high': return 5;
      case 'rush': return 10;
      default: return 15;
    }
  }

  /**
   * Get all valid "next statuses" for a ticket.
   */
  getValidNextStatuses(current: TicketStatus): TicketStatus[] {
    return TICKET_TRANSITIONS
      .filter((t) => t.from === current && t.allowed)
      .map((t) => t.to as TicketStatus);
  }
}
