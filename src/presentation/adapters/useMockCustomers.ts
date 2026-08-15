/**
 * useMockCustomers.ts — Customer hook backed by Zustand customer-store.
 */

import { useState, useCallback, useMemo } from 'react';
import { useCustomerStore } from '@/stores/customer-store';
import { notifySuccess, notifyError } from '@/stores/toast-store';
import { CustomerViewModel, type CustomerViewData } from '../viewModels/CustomerViewModel';

function toDomainCustomer(c: any): any {
  return {
    id: c.id, name: c.name, email: c.email ?? null, phone: c.phone,
    address: c.address ?? null, notes: c.notes ?? null,
    totalOrders: c.visits, totalSpentCents: Math.round(c.totalSpent * 100),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

export function useMockCustomers() {
  const store = useCustomerStore();
  const [isLoading, setIsLoading] = useState(false);

  const customers = useMemo(() =>
    store.customers.map(toDomainCustomer),
  [store.customers]);

  const customerViews = useMemo(() =>
    CustomerViewModel.toViewDataList(customers),
  [customers]);

  const searchCustomers = useCallback(async (query: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 100));
    const results = store.searchCustomers(query);
    setIsLoading(false);
    return results.map(toDomainCustomer);
  }, [store]);

  const fetchTopCustomers = useCallback(async () => {
    const sorted = [...store.customers].sort((a, b) => b.totalSpent - a.totalSpent);
    return sorted.slice(0, 4).map(toDomainCustomer);
  }, [store]);

  const createCustomer = useCallback(async (input: any) => {
    try {
      store.addCustomer({
        name: input.name,
        phone: input.phone ?? '',
        email: input.email,
        address: input.address,
        notes: input.notes,
      });
      notifySuccess(`${input.name} added`);
      return { success: true, data: null, error: null };
    } catch (err: any) {
      notifyError(err.message);
      return { success: false, data: null, error: err.message };
    }
  }, [store]);

  const updateCustomer = useCallback(async (input: any) => {
    store.updateCustomer(input.customerId, input);
    return { success: true, data: null, error: null };
  }, [store]);

  const topCustomers = useMemo(() =>
    [...store.customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 4).map(c => ({
      ...CustomerViewModel.toViewData(toDomainCustomer(c)),
      totalSpent: `₹${c.totalSpent.toLocaleString('en-IN')}`,
      totalOrders: c.visits,
    })),
  [store.customers]);

  return {
    customers, customerViews,
    searchCustomers, fetchTopCustomers,
    createCustomer, updateCustomer,
    topCustomers,
    isCreating: false,
    isLoadingCustomers: isLoading,
    createError: null,
  };
}
