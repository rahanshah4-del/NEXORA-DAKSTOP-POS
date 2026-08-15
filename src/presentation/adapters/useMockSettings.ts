/**
 * useMockSettings.ts — Settings hook backed by Zustand settings-store.
 */

import { useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import { notifySuccess } from '@/stores/toast-store';

export function useMockSettings() {
  const store = useSettingsStore();
  const [isLoading, setIsLoading] = useState(false);

  const settings = useMemo(() => ({
    'restaurant.name': store.restaurantName,
    'restaurant.phone': store.phone,
    'restaurant.address': store.address,
    'restaurant.email': store.email,
    'currency.symbol': '₹',
    'currency.locale': 'en-IN',
    'tax.rateBps': String(Math.round((parseFloat(store.cgstRate) + parseFloat(store.sgstRate)) * 100)),
    'tax.name': 'GST',
    'tax.inclusive': 'false',
    'receipt.footer': store.billFooter,
    'receipt.showTax': store.printGST ? 'true' : 'false',
    'receipt.printOnComplete': store.autoPrintKOT ? 'true' : 'false',
    'tips.enabled': 'true',
    'printer.receipt': store.printerName,
    'printer.kitchen': store.printerName,
    'kitchen.autoPrint': store.autoPrintKOT ? 'true' : 'false',
  }), [store]);

  const refetchSettings = useCallback(async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 100));
    setIsLoading(false);
  }, []);

  const updateSetting = useCallback(async (key: string, value: string) => {
    // Map setting keys to Zustand store fields
    const mappings: Record<string, keyof typeof store> = {
      'restaurant.name': 'restaurantName',
      'restaurant.phone': 'phone',
      'restaurant.address': 'address',
      'restaurant.email': 'email',
      'receipt.footer': 'billFooter',
      'printer.receipt': 'printerName',
      'printer.kitchen': 'printerName',
    };
    const storeKey = mappings[key];
    if (storeKey && storeKey in store) {
      (store as any).update({ [storeKey]: value });
    }
    notifySuccess('Saved', `Setting updated`);
    return { success: true };
  }, [store]);

  return {
    settings, updateSetting,
    setBatch: async (s: any) => { store.update(s); },
    refetchSettings, isLoading,
  };
}
