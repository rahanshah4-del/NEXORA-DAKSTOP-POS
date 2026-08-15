import { create } from 'zustand';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  prepTimeMinutes?: number;
  active: boolean;
}

interface MenuStore {
  items: MenuItem[];
  categories: string[];
  addItem: (item: Omit<MenuItem, 'id' | 'active'>) => void;
  updateItem: (id: string, data: Partial<MenuItem>) => void;
  removeItem: (id: string) => void;
  toggleActive: (id: string) => void;
  addCategory: (cat: string) => void;
  getActiveItems: () => MenuItem[];
  /** Bulk-replace all items (used when loading from Firestore). */
  setItems: (items: MenuItem[]) => void;
  /** Bulk-replace all categories (used when loading from Firestore). */
  setCategories: (categories: string[]) => void;
}

let idCounter = 200;

// NOTE: menu items are server-authoritative (Firestore) and are now kept in
// sync by a real-time listener (see useMenuSync). They are intentionally NOT
// persisted to localStorage — persisting here caused stale prices to rehydrate
// on every app restart and mask backend edits until a manual "Load Menu &
// Tables" click.
export const useMenuStore = create<MenuStore>()((set, get) => ({
  items: [],
  categories: [],

  addItem: (item) => {
    const newItem: MenuItem = {
      ...item,
      id: `m${++idCounter}`,
      active: true,
    };
    set((s) => ({ items: [...s.items, newItem] }));
  },

  updateItem: (id, data) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)),
    }));
  },

  removeItem: (id) => {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },

  toggleActive: (id) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, active: !i.active } : i)),
    }));
  },

  addCategory: (cat) => {
    set((s) => ({
      categories: s.categories.includes(cat) ? s.categories : [...s.categories, cat],
    }));
  },

  getActiveItems: () => {
    return get().items.filter((i) => i.active);
  },

  setItems: (items) => set({ items }),

  setCategories: (categories) => set({ categories }),
}));
