import { useSettingsStore } from '@/stores/settings-store';
import { getCurrencySymbol } from '@/utils/formatters';

export function useCurrencySymbol() {
  return getCurrencySymbol(useSettingsStore((s) => s.currency));
}
