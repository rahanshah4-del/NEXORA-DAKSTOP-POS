import React, { useEffect, useState } from 'react';
import { useKitchen } from '@/presentation/hooks/useKitchen';
import { notifySuccess, notifyInfo } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { TableSkeleton } from '../components/SkeletonLoader';
import { ScreenEmptyState } from '../components/ScreenStates';
import { cn } from '@/utils/cn';
import { ChefHat, CheckCircle2, Clock, Timer } from 'lucide-react';

const KITCHEN_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
];

export const KitchenScreen: React.FC = () => {
  const { tickets, pendingTickets, preparingTickets, readyTickets, isLoading, refetchQueue, updateItemStatus, completeTicket, fetchTicketItems, ticketItems } = useKitchen() as any;
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => { refetchQueue?.(); const i = setInterval(() => refetchQueue?.(), 15000); return () => clearInterval(i); }, []);

  const handleSelect = async (t: any) => { setSelectedTicket(t); await fetchTicketItems?.(t.id); };

  const filtered = activeTab === 'all' ? tickets : activeTab === 'pending' ? pendingTickets : activeTab === 'preparing' ? preparingTickets : readyTickets;
  const priorityBadge = (p: string) => p === 'high' ? 'danger' as const : p === 'rush' ? 'warning' as const : 'default' as const;
  const statusBadge = (s: string) => s === 'ready' ? 'success' as const : s === 'preparing' ? 'info' as const : s === 'completed' ? 'default' as const : 'warning' as const;

  return (
    <div className="flex h-full" role="region" aria-label="Kitchen Display System">
      {/* Ticket Queue */}
      <div className="w-80 lg:w-96 shrink-0 border-r border-border flex flex-col bg-surface-secondary">
        <div className="px-5 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-content">Kitchen</h1>
          <p className="text-xs text-content-secondary mt-0.5">{tickets?.length ?? 0} active tickets</p>
        </div>
        <div className="px-2 pt-2"><Tabs tabs={KITCHEN_TABS.map(t => ({ ...t, count: t.id === 'all' ? tickets?.length : t.id === 'pending' ? pendingTickets?.length : t.id === 'preparing' ? preparingTickets?.length : readyTickets?.length }))} activeTab={activeTab} onChange={setActiveTab} /></div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {isLoading ? <TableSkeleton rows={5} /> : filtered?.length === 0 ? (
            <ScreenEmptyState screen="kitchen" title="Queue clear" description="No tickets in this view" />
          ) : filtered?.map((ticket: any) => (
            <button key={ticket.id} onClick={() => handleSelect(ticket)}
              className={cn('w-full text-left p-3.5 rounded-xl border transition-all duration-150',
                selectedTicket?.id === ticket.id ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' : 'border-border bg-surface hover:border-primary/30 hover:shadow-sm')}>
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-bold text-sm">{ticket.tableName || `Order #${ticket.orderNumber}`}</p><p className="text-[11px] text-content-tertiary font-mono">#{ticket.orderNumber}</p></div>
                <Badge variant={statusBadge(ticket.status)} size="sm">{ticket.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-content-tertiary flex items-center gap-1"><Clock className="w-3 h-3" />{Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 60000)}m ago</span>
                {ticket.priority !== 'normal' && <Badge variant={priorityBadge(ticket.priority)} size="sm">{ticket.priority}</Badge>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Detail */}
      <div className="flex-1 flex flex-col bg-surface">
        {!selectedTicket ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-surface-secondary flex items-center justify-center mx-auto ring-1 ring-border"><ChefHat className="w-10 h-10 text-content-tertiary" strokeWidth={1.5} /></div>
              <p className="text-lg font-medium text-content-tertiary">Select a ticket</p>
              <p className="text-sm text-content-tertiary">View details and update item status</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-secondary/50">
              <div>
                <h2 className="font-bold text-lg">{selectedTicket.tableName || `Order #${selectedTicket.orderNumber}`}</h2>
                <p className="text-xs text-content-secondary font-mono">#{selectedTicket.orderNumber} · {selectedTicket.priority}</p>
              </div>
              {selectedTicket.status !== 'completed' && (
                <Button size="sm" onClick={() => { completeTicket?.({ ticketId: selectedTicket.id }); setSelectedTicket(null); }}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {(ticketItems ?? []).map((item: any) => (
                <Card key={item.id} padding="md" className={cn('transition-all duration-150', item.status === 'ready' && 'border-success/40 bg-success/[0.02]', item.status === 'preparing' && 'border-info/40 bg-info/[0.02]')}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-content">{item.productName} <span className="text-content-tertiary font-normal">×{item.quantity}</span></p>
                      {item.notes && <p className="text-xs text-content-tertiary mt-0.5 italic">↳ {item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusBadge(item.status)} size="sm">{item.status}</Badge>
                      {item.status === 'pending' && <Button size="sm" variant="outline" onClick={() => { updateItemStatus?.({ itemId: item.id, status: 'preparing' }); notifyInfo('Started', item.productName); }}><Timer className="w-3.5 h-3.5 mr-1" />Start</Button>}
                      {item.status === 'preparing' && <Button size="sm" onClick={() => { updateItemStatus?.({ itemId: item.id, status: 'ready' }); notifySuccess('Ready', item.productName); }}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Ready</Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
