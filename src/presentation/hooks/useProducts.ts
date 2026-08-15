/**
 * useProducts.ts — Product-specific hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { ProductViewModel, type ProductViewData } from '../viewModels/ProductViewModel';
import type { Product } from '../../types/models';

export function useProducts() {
  const createProduct = useCommand<Product>('ICreateProductCommand');
  const updateProduct = useCommand<Product>('IUpdateProductCommand');
  const updatePrice = useCommand<void>('IUpdateProductPriceCommand');
  const deactivateProduct = useCommand<void>('IDeactivateProductCommand');
  const bulkUpdatePrices = useCommand<Product[]>('IBulkUpdatePriceCommand');

  const menu = useQuery<Product>('IGetMenuQuery', { autoFetch: false });
  const searchResults = useQuery<Product>('ISearchProductsQuery', { autoFetch: false });

  const fetchMenu = useCallback(async (categoryId?: string) => {
    return menu.refetch({ categoryId, includeInactive: false });
  }, [menu]);

  const createNewProduct = useCallback(async (input: Record<string, unknown>) => {
    const result = await createProduct.execute(input);
    if (result.isSuccess) {
      notifySuccess('Product Created', `${(input as any).name ?? ''} added to menu`);
      await fetchMenu();
    } else notifyError('Product Failed', result.error ?? 'Could not create product');
    return result;
  }, [createProduct, fetchMenu]);

  const productViews = ProductViewModel.toViewDataList((menu.data?.items as Product[]) ?? []);

  return {
    createProduct: createNewProduct, updateProduct: updateProduct.execute,
    updatePrice: updatePrice.execute, deactivateProduct: deactivateProduct.execute,
    bulkUpdatePrices: bulkUpdatePrices.execute,
    isCreating: createProduct.isLoading, createError: createProduct.error,
    products: productViews, isLoadingProducts: menu.isLoading,
    refetchProducts: fetchMenu,
    searchProducts: searchResults.refetch,
    searchResults: ProductViewModel.toViewDataList((searchResults.data?.items as Product[]) ?? []),
  };
}
