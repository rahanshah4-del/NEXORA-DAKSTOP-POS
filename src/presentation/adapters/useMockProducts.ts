/**
 * useMockProducts.ts — Product hook backed by Zustand menu-store.
 *
 * Same interface as useProducts() but uses existing Zustand stores.
 * Zero IPC, zero SQLite, zero backend.
 */

import { useState, useCallback, useMemo } from 'react';
import { useMenuStore, type MenuItem } from '@/stores/menu-store';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { ProductViewModel, type ProductViewData } from '../viewModels/ProductViewModel';

// ── Map MenuItem → Product shape ──

function toProduct(item: MenuItem): any {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    sku: null,
    barcode: null,
    categoryId: item.category,
    categoryName: item.category,
    priceCents: Math.round(item.price * 100),
    costCents: Math.round((item.price * 100) * 0.4),
    taxRateBps: 500, // 5%
    imageUrl: null,
    isActive: item.active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function useMockProducts() {
  const store = useMenuStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() =>
    store.items.map(toProduct),
  [store.items]);

  const productViews = useMemo(() =>
    ProductViewModel.toViewDataList(products),
  [products]);

  const refetchProducts = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 200));
    setIsLoading(false);
  }, []);

  const createProduct = useCallback(async (input: any) => {
    try {
      store.addItem({
        name: input.name,
        price: (input.priceCents ?? 0) / 100,
        category: input.categoryId ?? 'Uncategorized',
        description: input.description,
      });
      notifySuccess(`${input.name} added to menu`);
      return { success: true, data: null, error: null };
    } catch (err: any) {
      setError(err.message);
      notifyError(err.message);
      return { success: false, data: null, error: err.message };
    }
  }, [store]);

  const updateProduct = useCallback(async (input: any) => {
    const updates: any = {};
    if (input.name) updates.name = input.name;
    if (input.priceCents !== undefined) updates.price = input.priceCents / 100;
    if (input.categoryId) updates.category = input.categoryId;
    if (input.description !== undefined) updates.description = input.description;
    store.updateItem(input.productId, updates);
    notifySuccess('Product updated');
    return { success: true, data: null, error: null };
  }, [store]);

  const deactivateProduct = useCallback(async (productId: string) => {
    store.toggleActive(productId);
    return { success: true, data: null, error: null };
  }, [store]);

  const searchProducts = useCallback(async (query: string) => {
    const q = query.toLowerCase();
    const filtered = store.items.filter(i => i.name.toLowerCase().includes(q));
    return filtered.map(toProduct);
  }, [store]);

  return {
    products, productViews,
    createProduct, updateProduct, deactivateProduct,
    updatePrice: async () => ({ success: true }),
    bulkUpdatePrices: async () => ({ success: true }),
    searchProducts,
    refetchProducts,
    isCreating: false,
    isLoadingProducts: isLoading,
    createError: error,
    searchResults: [],
  };
}
