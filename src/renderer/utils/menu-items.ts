import type { MenuItem } from '@/stores/menu-store';

/**
 * Normalize raw Firestore menuItem documents into the MenuItem shape used by
 * the menu store.
 *
 * This mirrors the mapping that originally lived inline in the "Load Menu &
 * Tables" handler (src/renderer/router/index.tsx) so the live listener and the
 * manual fetch share one source of truth for price normalization and field
 * coercion.
 */
export function mapMenuItems(rawItems: Array<Record<string, unknown>>): MenuItem[] {
  return rawItems.map((r) => ({
    id: String(r.id ?? `m-${Math.random().toString(36).slice(2, 9)}`),
    name: String(r.name ?? ''),
    price: Number(r.price) || 0,
    category: String(r.category || 'Uncategorized'),
    active: String(r.status) === 'Active',
    description: typeof r.description === 'string' ? r.description : undefined,
    image: typeof r.image === 'string' ? r.image : undefined,
    prepTimeMinutes: typeof r.prepTimeMinutes === 'number' ? r.prepTimeMinutes : undefined,
  }));
}

/** Derive a sorted, de-duplicated list of categories from menu items. */
export function extractCategories(items: MenuItem[]): string[] {
  return [...new Set(items.map((i) => i.category))].sort();
}
