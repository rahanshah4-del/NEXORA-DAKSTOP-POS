import { useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';

export function useSidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const hoverExpanded = useUIStore((s) => s.sidebarHoverExpanded);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const setCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const setHoverExpanded = useUIStore((s) => s.setSidebarHoverExpanded);

  const handleMouseEnter = useCallback(() => {
    if (collapsed) setHoverExpanded(true);
  }, [collapsed, setHoverExpanded]);

  const handleMouseLeave = useCallback(() => {
    setHoverExpanded(false);
  }, [setHoverExpanded]);

  const isExpanded = !collapsed || hoverExpanded;

  return {
    collapsed,
    hoverExpanded,
    isExpanded,
    toggle,
    setCollapsed,
    handleMouseEnter,
    handleMouseLeave,
  };
}
