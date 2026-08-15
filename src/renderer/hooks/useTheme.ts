import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';
import type { ThemeMode } from '@/stores/ui-store';

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const resolvedTheme = useUIStore((s) => s.resolvedTheme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => setTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme, setTheme]);

  const toggle = () => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggle,
    isDark: resolvedTheme === 'dark',
  };
}
