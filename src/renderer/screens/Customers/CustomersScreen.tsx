import React, { useEffect, useState } from 'react';
import { useCustomers } from '@/presentation/hooks/useCustomers';
import { notifySuccess } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { SearchBar } from '@/components/shared/SearchBar';
import { TableSkeleton } from '../components/SkeletonLoader';
import { ScreenEmptyState } from '../components/ScreenStates';
import { useForm } from '@/presentation/forms/useForm';
import { CUSTOMER_SCHEMA } from '@/presentation/forms/validation';
import { Plus, Phone, Mail, Crown } from 'lucide-react';

export const CustomersScreen: React.FC = () => {
  const { customers, createCustomer, searchCustomers, topCustomers, fetchTopCustomers, isCreating } = useCustomers() as any;
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const form = useForm({ name: '', email: '', phone: '', address: '', notes: '' }, CUSTOMER_SCHEMA);

  useEffect(() => { searchCustomers?.(''); fetchTopCustomers?.(); }, []);

  const handleSave = async () => { if (!form.validate()) return; await createCustomer?.({ ...form.values }); setModalOpen(false); form.reset(); searchCustomers?.(''); };

  const filtered = (customers ?? []).filter((c: any) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search));

  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Customers">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-content">Customers</h1><p className="text-sm text-content-secondary mt-0.5">{customers?.length ?? 0} customers</p></div>
        <Button onClick={() => { form.reset(); setModalOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>Add Customer</Button>
      </div>

      <SearchBar placeholder="Search by name or phone..." value={search} onChange={setSearch} onSearch={setSearch} />

      {topCustomers?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topCustomers?.slice(0, 4).map((c: any, i: number) => (
            <Card key={c.id} hover padding="lg" className="relative overflow-hidden group transition-all duration-200 hover:shadow-md">
              {i === 0 && <div className="absolute top-3 right-3"><Crown className="w-5 h-5 text-yellow-500" /></div>}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors">{c.initials}</div>
                <div className="min-w-0"><p className="font-semibold text-content truncate">{c.name}</p><p className="text-xs text-content-secondary">{c.phone || c.email || 'No contact'}</p></div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm font-bold text-primary tabular-nums">{c.totalSpent}</span>
                <Badge variant="success" size="sm">{c.totalOrders} orders</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c: any) => (
          <Card key={c.id} hover padding="md" className="flex items-center justify-between group transition-all duration-150">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-secondary flex items-center justify-center font-semibold text-sm text-content-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">{c.initials}</div>
              <div><p className="font-medium text-content">{c.name}</p><div className="flex items-center gap-3 text-xs text-content-tertiary">{c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}{c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}</div></div>
            </div>
            <div className="text-right"><p className="text-sm font-semibold tabular-nums">{c.totalSpent}</p><p className="text-xs text-content-tertiary">{c.totalOrders} orders</p></div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Customer" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} isLoading={isCreating}>Create Customer</Button></div>}
      >
        <div className="space-y-4">
          <Input label="Name" value={form.values.name as string} onChange={(e) => form.setValue('name', e.target.value)} error={form.touched.name ? (form.errors as any).name : undefined} autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.values.email as string} onChange={(e) => form.setValue('email', e.target.value)} />
            <Input label="Phone" value={form.values.phone as string} onChange={(e) => form.setValue('phone', e.target.value)} />
          </div>
          <Input label="Address" value={form.values.address as string} onChange={(e) => form.setValue('address', e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
