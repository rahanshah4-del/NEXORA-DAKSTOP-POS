/**
 * useMockKitchen.ts — Kitchen/KDS hook backed by local React state.
 */

import { useState, useCallback, useMemo } from 'react';
import { notifySuccess } from '@/stores/toast-store';

interface MockTicket {
  id: string; orderId: string; orderNumber: number; tableName: string | null;
  status: string; priority: string; notes: string | null; createdAt: string; updatedAt: string;
}
interface MockTicketItem {
  id: string; ticketId: string; productId: string; productName: string;
  quantity: number; notes: string | null; status: string; createdAt: string; updatedAt: string;
}

const DEFAULT_TICKETS: MockTicket[] = [
  { id: 'kt1', orderId: 'ord_1', orderNumber: 101, tableName: 'T2', status: 'preparing', priority: 'normal', notes: null, createdAt: new Date(Date.now() - 600000).toISOString(), updatedAt: '' },
  { id: 'kt2', orderId: 'ord_2', orderNumber: 102, tableName: 'T5', status: 'pending', priority: 'rush', notes: null, createdAt: new Date(Date.now() - 120000).toISOString(), updatedAt: '' },
  { id: 'kt3', orderId: 'ord_3', orderNumber: 103, tableName: null, status: 'ready', priority: 'high', notes: null, createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: '' },
];

const DEFAULT_ITEMS: MockTicketItem[] = [
  { id: 'kti1', ticketId: 'kt1', productId: 'm1', productName: 'Butter Chicken', quantity: 2, notes: 'Extra spicy', status: 'preparing', createdAt: '', updatedAt: '' },
  { id: 'kti2', ticketId: 'kt1', productId: 'm3', productName: 'Dal Makhani', quantity: 1, notes: null, status: 'pending', createdAt: '', updatedAt: '' },
  { id: 'kti3', ticketId: 'kt2', productId: 'm6', productName: 'Biryani', quantity: 1, notes: null, status: 'pending', createdAt: '', updatedAt: '' },
  { id: 'kti4', ticketId: 'kt3', productId: 'm2', productName: 'Paneer Tikka', quantity: 1, notes: null, status: 'ready', createdAt: '', updatedAt: '' },
];

export function useMockKitchen() {
  const [tickets, setTickets] = useState<MockTicket[]>(DEFAULT_TICKETS);
  const [items, setItems] = useState<MockTicketItem[]>(DEFAULT_ITEMS);
  const [isLoading, setIsLoading] = useState(false);

  const pendingTickets = useMemo(() => tickets.filter(t => t.status === 'pending'), [tickets]);
  const preparingTickets = useMemo(() => tickets.filter(t => t.status === 'preparing'), [tickets]);
  const readyTickets = useMemo(() => tickets.filter(t => t.status === 'ready'), [tickets]);

  const refetchQueue = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 200));
    setIsLoading(false);
  }, []);

  const fetchTicketItems = useCallback(async (ticketId: string) => {
    return items.filter(i => i.ticketId === ticketId);
  }, [items]);

  const updateItemStatus = useCallback(async (input: any) => {
    setItems(prev => prev.map(i => i.id === input.itemId ? { ...i, status: input.status } : i));
    notifySuccess('Item Updated', `Marked as ${input.status}`);
    return { success: true };
  }, []);

  const markItemReady = useCallback(async (input: any) => {
    setItems(prev => prev.map(i => i.id === input.itemId ? { ...i, status: 'ready' } : i));
    return { success: true };
  }, []);

  const completeTicket = useCallback(async (input: any) => {
    setTickets(prev => prev.map(t => t.id === input.ticketId ? { ...t, status: 'completed' } : t));
    notifySuccess('Complete', 'Ticket completed');
    return { success: true };
  }, []);

  const ticketItems = useMemo(() => items, [items]);

  return {
    tickets, pendingTickets, preparingTickets, readyTickets, ticketItems,
    isLoading, refetchQueue, fetchTicketItems,
    createTicket: async () => ({ success: true }),
    updateItemStatus, markItemReady, completeTicket,
    updateTicketStatus: async () => ({ success: true }),
  };
}
