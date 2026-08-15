import React, { useEffect, useState } from 'react';
import { useProducts } from '@/presentation/hooks/useProducts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { SearchBar } from '@/components/shared/SearchBar';
import { formatCurrency } from '@/utils/formatters';
import { GridSkeleton } from '../components/SkeletonLoader';
import { ScreenEmptyState } from '../components/ScreenStates';
import { useForm } from '@/presentation/forms/useForm';
import { PRODUCT_SCHEMA } from '@/presentation/forms/validation';
import { notifySuccess } from '@/stores/toast-store';
import { Plus, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/utils/cn';

export const ProductsScreen: React.FC = () => {
  const { products, createProduct, updateProduct, isCreating, refetchProducts, isLoadingProducts } = useProducts() as any;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState('');

  const form = useForm({ name: '', priceCents: 0, costCents: 0, categoryId: '', sku: '', description: '' }, PRODUCT_SCHEMA);

  useEffect(() => { refetchProducts?.(); }, []);

  const handleSave = async () => {
    if (!form.validate()) return;
    const data = { ...form.values, priceCents: Number(form.values.priceCents), costCents: Number(form.values.costCents) };
    if (editing) { await updateProduct?.({ productId: editing.id, ...data }); notifySuccess('Updated', `${data.name} updated`); }
    else { await createProduct?.(data); }
    setModalOpen(false); setEditing(null); form.reset(); refetchProducts?.();
  };

  const openEdit = (product: any) => {
    setEditing(product);
    form.setValues({ name: product.name, priceCents: product.priceCents ?? 0, costCents: product.costCents ?? 0, categoryId: product.categoryId ?? '', sku: product.sku ?? '', description: product.description ?? '' });
    setModalOpen(true);
  };

  const filtered = (products ?? []).filter((p: any) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 lg:p-8 space-y-6" role="region" aria-label="Products management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content">Products</h1>
          <p className="text-sm text-content-secondary mt-0.5">{products?.length ?? 0} items in menu</p>
        </div>
        <Button onClick={() => { setEditing(null); form.reset(); setModalOpen(true); }} leftIcon={<Plus className="w-4 h-4" />} size="md">
          Add Product
        </Button>
      </div>

      <SearchBar placeholder="Search by name, SKU, or barcode..." value={search} onChange={setSearch} onSearch={setSearch} />

      {isLoadingProducts ? <GridSkeleton count={8} /> : filtered.length === 0 ? (
        <ScreenEmptyState screen="products" title="No products yet" description="Add your first menu item to start selling" action="Add Product" onAction={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => (
            <Card key={product.id} hover padding="lg" onClick={() => openEdit(product)} className="cursor-pointer group transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-primary/20" role="button" tabIndex={0} aria-label={`Edit ${product.name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(product); } }}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-content truncate group-hover:text-primary transition-colors">{product.name}</h3>
                <Badge variant={product.isActive ? 'success' : 'default'} size="sm" dot>{product.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-xs text-content-tertiary mb-3">{product.categoryName ?? 'Uncategorized'}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-content tabular-nums">{product.price ?? formatCurrency(product.priceCents)}</p>
                  {product.costCents > 0 && <p className="text-xs text-content-tertiary">Cost: {formatCurrency(product.costCents)}</p>}
                </div>
                {product.marginPercent && (
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', parseFloat(product.marginPercent) > 30 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                    {product.marginPercent} margin
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit Product' : 'Add Product'} size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setModalOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} isLoading={isCreating}>{editing ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Product Name" value={form.values.name as string} onChange={(e) => form.setValue('name', e.target.value)} error={form.touched.name ? (form.errors as any).name : undefined} autoFocus />
            <Input label="SKU" value={form.values.sku as string} onChange={(e) => form.setValue('sku', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (cents)" type="number" value={String(form.values.priceCents)} onChange={(e) => form.setValue('priceCents', Number(e.target.value))} error={form.touched.priceCents ? (form.errors as any).priceCents : undefined} />
            <Input label="Cost (cents)" type="number" value={String(form.values.costCents)} onChange={(e) => form.setValue('costCents', Number(e.target.value))} />
          </div>
          <Input label="Description" value={form.values.description as string} onChange={(e) => form.setValue('description', e.target.value)} />
        </div>
      </Modal>
    </div>
  );
};
