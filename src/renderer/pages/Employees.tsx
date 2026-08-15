import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { Plus, UserCog } from 'lucide-react';

const employees = [
  { id: '1', name: 'Rajesh Kumar', role: 'Waiter', email: 'rajesh@nexora.com', phone: '+91 98111 12345', status: 'active', shift: 'Morning' },
  { id: '2', name: 'Sunita Devi', role: 'Chef', email: 'sunita@nexora.com', phone: '+91 98111 23456', status: 'active', shift: 'Morning' },
  { id: '3', name: 'Mohammed Ali', role: 'Cashier', email: 'mali@nexora.com', phone: '+91 98111 34567', status: 'active', shift: 'Evening' },
  { id: '4', name: 'Deepa Sharma', role: 'Manager', email: 'deepa@nexora.com', phone: '+91 98111 45678', status: 'active', shift: 'Full Day' },
  { id: '5', name: 'Arun Singh', role: 'Waiter', email: 'arun@nexora.com', phone: '+91 98111 56789', status: 'inactive', shift: '—' },
];

export default function Employees() {
  return (
    <PageContainer padding="lg">
      <PageHeader
        title="Employees"
        description="Manage staff, roles, and schedules"
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Add Employee
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchBar placeholder="Search employees..." className="w-72" />
        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: employees.length },
            { id: 'active', label: 'Active', count: employees.filter((e) => e.status === 'active').length },
            { id: 'inactive', label: 'Inactive', count: employees.filter((e) => e.status === 'inactive').length },
          ]}
        />
      </div>

      <Table
        columns={[
          {
            key: 'name', header: 'Employee', accessor: (r) => (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent">{r.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-content">{r.name}</p>
                  <p className="text-xs text-content-secondary">{r.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Role', accessor: (r) => <Badge variant="primary" size="sm">{r.role}</Badge> },
          { key: 'phone', header: 'Phone', accessor: (r) => <span className="text-sm text-content-secondary">{r.phone}</span> },
          { key: 'shift', header: 'Shift', accessor: (r) => <span className="text-sm">{r.shift}</span> },
          {
            key: 'status', header: 'Status', accessor: (r) => (
              <Badge variant={r.status === 'active' ? 'success' : 'default'} dot size="sm">{r.status}</Badge>
            ),
          },
        ]}
        data={employees}
        keyExtractor={(r) => r.id}
        emptyState={<EmptyState icon={UserCog} title="No employees" description="Add your first employee" />}
      />
    </PageContainer>
  );
}
