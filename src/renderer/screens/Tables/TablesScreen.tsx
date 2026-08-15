import React, { useEffect, useState } from 'react';
import { useTables } from '@/presentation/hooks/useTables';
import { notifySuccess, notifyInfo } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { GridSkeleton } from '../components/SkeletonLoader';
import { ScreenEmptyState } from '../components/ScreenStates';
import { useForm } from '@/presentation/forms/useForm';
import { TABLE_SCHEMA } from '@/presentation/forms/validation';
import { cn } from '@/utils/cn';
import { Plus, Users, MapPin, ChefHat, RefreshCw } from 'lucide-react';

export const TablesScreen: React.FC = () => {
  const { tables, updateStatus, refetchTables, isLoading } = useTables() as any;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const form = useForm({ name: '', section: '', capacity: 4 }, TABLE_SCHEMA);

  useEffect(() => { refetchTables?.(); }, []);

  const handleStatus = async (id: string, status: string) => {
    await updateStatus?.({ tableId: id, status });
    notifyInfo('Updated', `Status changed to ${status}`);
    refetchTables?.();
  };

  const activeCount = (tables ?? []).filter((t: any) => !t.isAvailable).length;
  const availableCount = (tables ?? []).filter((t: any) => t.isAvailable).length;

  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Table management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Tables</h1>
          <p className="text-sm text-content-secondary mt-0.5">{availableCount} available · {activeCount} occupied</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchTables?.()} leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
          <Button size="sm" onClick={() => { setEditing(null); form.reset(); setModalOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>Add Table</Button>
        </div>
      </div>

      {isLoading ? <GridSkeleton count={6} /> : (tables ?? []).length === 0 ? (
        <ScreenEmptyState screen="tables" title="No tables configured" description="Add tables to manage your floor plan" action="Add Table" onAction={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {(tables ?? []).map((table: any) => (
            <Card key={table.id} hover onClick={() => setEditing(table)} padding="lg"
              className={cn('cursor-pointer transition-all duration-200 hover:shadow-md border-2 group',
                table.statusColor === 'green' ? 'border-success/30 bg-success/[0.02] hover:border-success/50' :
                table.statusColor === 'red' ? 'border-danger/30 bg-danger/[0.02] hover:border-danger/50' :
                table.statusColor === 'orange' ? 'border-warning/30 bg-warning/[0.02] hover:border-warning/50' :
                'border-border hover:border-primary/30')}
              role="button" tabIndex={0} aria-label={`${table.name}, ${table.statusLabel}, ${table.capacity} seats`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg text-content group-hover:text-primary transition-colors">{table.name}</h3>
                <Badge variant={table.statusColor === 'green' ? 'success' : table.statusColor === 'red' ? 'danger' : table.statusColor === 'orange' ? 'warning' : 'default'} size="sm" dot>{table.statusLabel}</Badge>
              </div>
              <div className="space-y-2 text-xs text-content-secondary">
                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{table.capacity} seats</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{table.section || 'Main'}</div>
                {table.currentOrderId && <div className="flex items-center gap-1.5 text-warning"><ChefHat className="w-3.5 h-3.5" />Active Order</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? 'Table Details'} size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            {editing?.status === 'occupied' && <Button variant="outline" onClick={() => { handleStatus(editing.id, 'available'); setEditing(null); }}>Mark Available</Button>}
            {editing?.status === 'available' && <Button variant="outline" onClick={() => { handleStatus(editing.id, 'occupied'); setEditing(null); }}>Mark Occupied</Button>}
            <Button variant="ghost" onClick={() => setEditing(null)}>Close</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-content-secondary">Section</div><div className="font-medium">{editing?.section || 'Main'}</div>
          <div className="text-content-secondary">Capacity</div><div className="font-medium">{editing?.capacity} seats</div>
          <div className="text-content-secondary">Status</div><div><Badge variant={editing?.statusColor === 'green' ? 'success' : 'danger'} size="sm" dot>{editing?.statusLabel}</Badge></div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Table" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => { form.handleSubmit(async () => { setModalOpen(false); refetchTables?.(); }); }}>Create Table</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Table Name" value={form.values.name as string} onChange={(e) => form.setValue('name', e.target.value)} error={form.touched.name ? (form.errors as any).name : undefined} autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Section" value={form.values.section as string} onChange={(e) => form.setValue('section', e.target.value)} />
            <Input label="Capacity" type="number" value={String(form.values.capacity)} onChange={(e) => form.setValue('capacity', Number(e.target.value))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
