import { useWorkspaceCurrencyValue } from '@/hooks/useWorkspaceCurrency';
import { getWorkspaceSymbol } from '@/utils/workspaceMoney';

/**
 * The currency symbol for the current workspace.
 *
 * Now backed by the workspace document (workspaces/{workspaceId}) rather than
 * the local settings-store, so the desktop matches the web dashboard. The
 * export name and signature are unchanged, so every existing reactive consumer
 * upgrades without edits.
 *
 * Returns the owner's override when set, otherwise the Intl symbol for the
 * resolved code ("₹" for INR, "$" for USD, "PKR" for PKR).
 */
export function useCurrencySymbol() {
  const { currencyCode, currencySymbol } = useWorkspaceCurrencyValue();
  return getWorkspaceSymbol(currencyCode, currencySymbol);
}
