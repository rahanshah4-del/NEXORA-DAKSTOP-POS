import { useCurrencySymbol } from '@/hooks/useCurrency';
import { useSettingsStore } from '@/stores/settings-store';
import { getCurrencySymbol } from '@/utils/formatters';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatsCard } from '@/components/shared/StatsCard';
import { Plus, Boxes, AlertTriangle } from 'lucide-react';

const inventoryItems = [
  { id: '1', name: 'Chicken (Fresh)', unit: 'kg', qty: 45, reorderPoint: 10, status: 'ok' },
  { id: '2', name: 'Paneer', unit: 'kg', qty: 8, reorderPoint: 10, status: 'low' },
  { id: '3', name: 'Basmati Rice', unit: 'kg', qty: 120, reorderPoint: 25, status: 'ok' },
  { id: '4', name: 'Wheat Flour', unit: 'kg', qty: 60, reorderPoint: 20, status: 'ok' },
  { id: '5', name: 'Cooking Oil', unit: 'L', qty: 5, reorderPoint: 10, status: 'low' },
  { id: '6', name: 'Butter', unit: 'kg', qty: 3, reorderPoint: 5, status: 'critical' },
  { id: '7', name: 'Tomatoes', unit: 'kg', qty: 30, reorderPoint: 15, status: 'ok' },
  { id: '8', name: 'Onions', unit: 'kg', qty: 50, reorderPoint: 20, status: 'ok' },
];

export default function Inventory() {
  const currSymbol = useCurrencySymbol();
  const lowStock = inventoryItems.filter((i) => i.status !== 'ok').length;

  return (
    <PageContainer padding="lg">
      <PageHeader
        title="Inventory"
        description="Track stock levels and manage inventory"
        actions={
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
            Add Item
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatsCard title="Total Items" value={inventoryItems.length} icon={Boxes} iconColor="text-primary" />
        <StatsCard title="Low Stock" value={lowStock} change="Needs attention" changeType="warning" icon={AlertTriangle} iconColor="text-warning" />
        <StatsCard title="Reorder Cost" value="₹4,800" subtitle="Estimated" icon={AlertTriangle} iconColor="text-info" />
      </div>

      <div className="flex items-center gap-3 mb-4">
        <SearchBar placeholder="Search inventory..." className="w-72" />
      </div>

      <Table
        columns={[
          { key: 'name', header: 'Item', accessor: (r) => <span className="text-sm font-medium text-content">{r.name}</span> },
          { key: 'unit', header: 'Unit', accessor: (r) => <span className="text-sm text-content-secondary">{r.unit}</span> },
          { key: 'qty', header: 'Qty On Hand', accessor: (r) => (
            <span className={`text-sm font-semibold ${r.status === 'critical' ? 'text-danger' : r.status === 'low' ? 'text-warning' : 'text-content'}`}>
              {r.qty}
            </span>
          )},
          { key: 'reorder', header: 'Reorder At', accessor: (r) => <span className="text-sm text-content-secondary">{r.reorderPoint}</span> },
          { key: 'status', header: 'Status', accessor: (r) => (
            <Badge variant={r.status === 'critical' ? 'danger' : r.status === 'low' ? 'warning' : 'success'} dot size="sm">
              {r.status === 'critical' ? 'Critical' : r.status === 'low' ? 'Low Stock' : 'In Stock'}
            </Badge>
          )},
        ]}
        data={inventoryItems}
        keyExtractor={(r) => r.id}
        emptyState={<EmptyState icon={Boxes} title="No inventory items" description="Start tracking your stock" />}
      />
    </PageContainer>
  );
}
