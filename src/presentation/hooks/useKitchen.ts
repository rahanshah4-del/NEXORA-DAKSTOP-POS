/**
 * useKitchen.ts — Kitchen/KDS hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess, notifyInfo } from '@/stores/toast-store';
import type { KitchenTicket, KitchenTicketItem } from '../../repositories/IKitchenRepository';

export function useKitchen() {
  const createTicket = useCommand<KitchenTicket>('ICreateKitchenTicketCommand');
  const updateItemStatus = useCommand<void>('IUpdateTicketItemStatusCommand');
  const completeTicket = useCommand<void>('ICompleteKitchenTicketCommand');
  const markItemReady = useCommand<void>('IMarkItemReadyCommand');
  const kitchenQueue = useQuery<KitchenTicket>('IGetKitchenQueueQuery', { autoFetch: false });
  const ticketItems = useQuery<KitchenTicketItem>('IGetTicketItemsQuery', { autoFetch: false });

  const fetchQueue = useCallback(async () => kitchenQueue.refetch(), [kitchenQueue]);
  const fetchItems = useCallback(async (ticketId: string) => ticketItems.refetch({ ticketId }), [ticketItems]);

  const tickets = (kitchenQueue.data?.items ?? []) as KitchenTicket[];

  return {
    createTicket: createTicket.execute, updateItemStatus: updateItemStatus.execute,
    completeTicket: completeTicket.execute, markItemReady: markItemReady.execute,
    tickets, pendingTickets: tickets.filter((t: any) => t.status === 'pending'),
    preparingTickets: tickets.filter((t: any) => t.status === 'preparing'),
    readyTickets: tickets.filter((t: any) => t.status === 'ready'),
    isLoading: kitchenQueue.isLoading, refetchQueue: fetchQueue,
    fetchTicketItems: fetchItems,
    ticketItems: (ticketItems.data?.items ?? []) as KitchenTicketItem[],
  };
}
