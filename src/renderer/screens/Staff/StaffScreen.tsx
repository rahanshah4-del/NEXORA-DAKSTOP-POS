import React, { useEffect, useState } from 'react';
import { useStaff } from '@/presentation/hooks/useStaff';
import { notifySuccess } from '@/stores/toast-store';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { SearchBar } from '@/components/shared/SearchBar';
import { formatTime } from '@/utils/formatters';
import { TableSkeleton } from '../components/SkeletonLoader';
import { ScreenEmptyState } from '../components/ScreenStates';
import { useForm } from '@/presentation/forms/useForm';
import { EMPLOYEE_SCHEMA } from '@/presentation/forms/validation';
import { Clock, LogIn, LogOut, UserPlus } from 'lucide-react';

const STAFF_TABS = [{ id: 'all', label: 'All Staff' }, { id: 'shifts', label: 'On Duty' }];

export const StaffScreen: React.FC = () => {
  const { employees, activeShifts, clockIn, clockOut, createEmployee, refetchStaff, refetchShifts, isLoading } = useStaff() as any;
  const [activeTab, setActiveTab] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [clockInOpen, setClockInOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [search, setSearch] = useState('');

  const form = useForm({ firstName: '', lastName: '', email: '', phone: '', role: 'staff', hourlyRateCents: 0 }, EMPLOYEE_SCHEMA);

  useEffect(() => { refetchStaff?.(); refetchShifts?.(); }, []);

  const onDutyIds = new Set((activeShifts ?? []).map((s: any) => s.employeeId));
  const filtered = (employees ?? []).filter((e: any) => !search || `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Staff management">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-content">Staff</h1><p className="text-sm text-content-secondary mt-0.5">{employees?.length ?? 0} employees · {activeShifts?.length ?? 0} on duty</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setClockInOpen(true)} leftIcon={<LogIn className="w-4 h-4" />}>Clock In</Button>
          <Button size="sm" onClick={() => { form.reset(); setModalOpen(true); }} leftIcon={<UserPlus className="w-4 h-4" />}>Add</Button>
        </div>
      </div>

      <div className="flex items-center gap-4"><Tabs tabs={STAFF_TABS} activeTab={activeTab} onChange={setActiveTab} /><div className="flex-1"><SearchBar placeholder="Search staff..." value={search} onChange={setSearch} onSearch={setSearch} /></div></div>

      {isLoading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <ScreenEmptyState screen="staff" title="No staff" description="Add your first employee" action="Add Employee" onAction={() => setModalOpen(true)} />
      ) : (
        <div className="space-y-3">
          {activeTab !== 'all' && activeShifts?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {activeShifts?.map((shift: any) => {
                const emp = employees?.find((e: any) => e.id === shift.employeeId);
                return (
                  <Card key={shift.id} padding="md" className="border-success/30 bg-success/[0.02]">
                    <div className="flex items-center justify-between">
                      <div><p className="font-semibold">{emp?.firstName} {emp?.lastName}</p><p className="text-xs text-content-tertiary flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(shift.clockIn)}</p></div>
                      <Button size="sm" variant="outline" onClick={() => { clockOut?.({ shiftId: shift.id }); refetchShifts?.(); }}><LogOut className="w-3.5 h-3.5 mr-1" />Clock Out</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {filtered.map((emp: any) => (
            <Card key={emp.id} hover padding="md" className="flex items-center justify-between group transition-all duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-secondary flex items-center justify-center font-semibold text-content-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                <div><p className="font-medium text-content">{emp.firstName} {emp.lastName}</p><p className="text-xs text-content-tertiary capitalize">{emp.role}{emp.email ? ` · ${emp.email}` : ''}</p></div>
              </div>
              <div className="flex items-center gap-3">
                {onDutyIds.has(emp.id) && <Badge variant="success" size="sm" dot>On Duty</Badge>}
                <Badge variant={emp.isActive ? 'success' : 'default'} size="sm">{emp.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={clockInOpen} onClose={() => setClockInOpen(false)} title="Clock In" size="sm"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setClockInOpen(false)}>Cancel</Button><Button onClick={async () => { if (selectedEmp) { await clockIn?.({ employeeId: selectedEmp.id }); setClockInOpen(false); refetchShifts?.(); } }} disabled={!selectedEmp}>Clock In</Button></div>}
      >
        <div className="space-y-2">
          {employees?.filter((e: any) => e.isActive && !onDutyIds.has(e.id)).map((emp: any) => (
            <button key={emp.id} onClick={() => setSelectedEmp(emp)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedEmp?.id === emp.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
              <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p><p className="text-xs text-content-tertiary capitalize">{emp.role}</p>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Employee" size="md"
        footer={<div className="flex gap-3 justify-end"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={async () => { if (form.validate()) { await createEmployee?.({ ...form.values, hourlyRateCents: Number(form.values.hourlyRateCents) }); setModalOpen(false); form.reset(); refetchStaff?.(); } }}>Create</Button></div>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.values.firstName as string} onChange={(e) => form.setValue('firstName', e.target.value)} error={form.touched.firstName ? (form.errors as any).firstName : undefined} autoFocus />
            <Input label="Last Name" value={form.values.lastName as string} onChange={(e) => form.setValue('lastName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4"><Input label="Email" type="email" value={form.values.email as string} onChange={(e) => form.setValue('email', e.target.value)} /><Input label="Phone" value={form.values.phone as string} onChange={(e) => form.setValue('phone', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-content mb-1.5">Role</label><select className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm" value={form.values.role as string} onChange={(e) => form.setValue('role', e.target.value)}>{['staff','waiter','cashier','chef','manager','admin'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
            <Input label="Hourly Rate (cents)" type="number" value={String(form.values.hourlyRateCents)} onChange={(e) => form.setValue('hourlyRateCents', Number(e.target.value))} />
          </div>
        </div>
      </Modal>
    </div>
  );
};
