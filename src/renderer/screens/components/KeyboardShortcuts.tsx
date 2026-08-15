import React, { useEffect, useCallback } from 'react';

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  shortcuts, enabled = true,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    // Don't fire when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    for (const s of shortcuts) {
      const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = s.alt ? e.altKey : !e.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        e.preventDefault();
        s.handler();
        return;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null; // Invisible component
};

// Pre-built shortcut sets
export const POS_SHORTCUTS = {
  NEW_ORDER: { key: 'n', ctrl: true, description: 'New Order' },
  SEARCH: { key: 'f', ctrl: true, description: 'Search' },
  PRINT: { key: 'p', ctrl: true, description: 'Print' },
  SAVE: { key: 's', ctrl: true, description: 'Save' },
  ESCAPE: { key: 'Escape', description: 'Close / Back' },
  FULLSCREEN: { key: 'F11', description: 'Fullscreen' },
  DASHBOARD: { key: '1', alt: true, description: 'Dashboard' },
  BILLING: { key: '2', alt: true, description: 'Billing' },
  KITCHEN: { key: '3', alt: true, description: 'Kitchen' },
  TABLES: { key: '4', alt: true, description: 'Tables' },
} as const;
