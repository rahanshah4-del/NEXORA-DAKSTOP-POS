import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TableData {
  id: string;
  name: string;
  section: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'billing';
  customer?: string;
  orderTotal?: number;
  guests?: number;
  time?: string;
  orderId?: string;
}

interface TableStore {
  tables: TableData[];
  /** Bulk-replace the entire tables array (used when loading from Firestore). */
  setTables: (tables: TableData[]) => void;
  /** Update a single table's fields in place. */
  updateTable: (id: string, data: Partial<TableData>) => void;
}

export const useTableStore = create<TableStore>()(
  persist(
    (set) => ({
      tables: [],

      setTables: (tables) => set({ tables }),

      updateTable: (id, data) =>
        set((s) => ({
          tables: s.tables.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
    }),
    { name: 'nexora-table-store', version: 2, migrate: () => ({ tables: [] }) },
  ),
);
