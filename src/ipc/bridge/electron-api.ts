/**
 * bridge/electron-api.ts — Type declaration for window.restaurant.
 *
 * Extends the global Window interface so TypeScript knows about
 * window.restaurant without needing separate .d.ts files.
 *
 * Usage in renderer:
 *   const result = await window.restaurant.orders.create({ ... });
 */

import type { RestaurantApi } from './types';

declare global {
  interface Window {
    /** Restaurant POS API — exposed via contextBridge. */
    restaurant: RestaurantApi;

    /** Legacy API (existing — not modified by this module). */
    api: import('../../preload/index').ElectronApi;
  }
}

export {};
