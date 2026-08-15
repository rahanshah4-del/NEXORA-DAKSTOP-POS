/**
 * useCustomers.ts — Customer-specific hooks. Phase 16: connected to backend via IPC.
 */

import { useCallback } from 'react';
import { useCommand } from './useCommand';
import { useQuery } from './useQuery';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { CustomerViewModel, type CustomerViewData } from '../viewModels/CustomerViewModel';
import type { Customer } from '../../types/models';

export function useCustomers() {
  const createCustomer = useCommand<Customer>('ICreateCustomerCommand');
  const updateCustomer = useCommand<Customer>('IUpdateCustomerCommand');
  const searchResults = useQuery<Customer>('ISearchCustomersQuery', { autoFetch: false });
  const topCustomers = useQuery<Customer>('IGetTopCustomersQuery', { autoFetch: false });

  const createNewCustomer = useCallback(async (input: Record<string, unknown>) => {
    const result = await createCustomer.execute(input);
    if (result.isSuccess) notifySuccess('Customer Created', `${(input as any).name ?? ''} added`);
    else notifyError('Customer Failed', result.error ?? 'Could not create customer');
    return result;
  }, [createCustomer]);

  const search = useCallback(async (query: string) => searchResults.refetch({ query }), [searchResults]);

  const customerViews = CustomerViewModel.toViewDataList((searchResults.data?.items as Customer[]) ?? []);
  const topCustomerViews = CustomerViewModel.toViewDataList((topCustomers.data?.items as Customer[]) ?? []);

  return {
    createCustomer: createNewCustomer, updateCustomer: updateCustomer.execute,
    isCreating: createCustomer.isLoading, createError: createCustomer.error,
    searchCustomers: search, customers: customerViews,
    isLoadingCustomers: searchResults.isLoading,
    topCustomers: topCustomerViews,
    fetchTopCustomers: () => topCustomers.refetch({ metric: 'spent', limit: 10 }),
  };
}
