import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  visits: number;
  totalSpent: number;
  lastVisit: string;
  wallet: number; // prepaid balance
  creditLimit: number; // max credit allowed
  dues: number; // outstanding amount
  notes?: string;
}

const defaultCustomers: Customer[] = [];

interface CustomerStore {
  customers: Customer[];
  addCustomer: (customer: { name: string; phone: string; email?: string; address?: string; wallet?: number; creditLimit?: number; dues?: number; notes?: string }) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
}

let idCounter = 300;

export const useCustomerStore = create<CustomerStore>()(
  persist(
    (set, get) => ({
      customers: defaultCustomers,

      addCustomer: (data) => {
        const newCustomer: Customer = {
          ...data,
          id: `c${++idCounter}`,
          visits: 1,
          totalSpent: 0,
          lastVisit: 'Today',
          wallet: 0,
          creditLimit: 0,
          dues: 0,
          notes: '',
        };
        set((s) => ({ customers: [...s.customers, newCustomer] }));
        return newCustomer;
      },

      updateCustomer: (id, data) => {
        set((s) => ({
          customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },

      removeCustomer: (id) => {
        set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
      },

      getCustomerById: (id) => {
        return get().customers.find((c) => c.id === id);
      },

      searchCustomers: (query) => {
        const q = query.toLowerCase();
        return get().customers.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(query) ||
            (c.email && c.email.toLowerCase().includes(q)),
        );
      },
    }),
    { name: 'nexora-customer-store', version: 1 },
  ),
);
