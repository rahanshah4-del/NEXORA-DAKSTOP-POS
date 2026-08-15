import { useState, useEffect, useCallback } from 'react';

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.api) return;

    window.api.window.isMaximized().then(setIsMaximized);
    const unsubscribe = window.api.window.onMaximizeChange(setIsMaximized);

    return unsubscribe;
  }, []);

  const minimize = useCallback(() => window.api?.window.minimize(), []);
  const maximize = useCallback(() => window.api?.window.maximize(), []);
  const close = useCallback(() => window.api?.window.close(), []);

  return {
    isMaximized,
    minimize,
    maximize,
    close,
    isElectron: typeof window !== 'undefined' && !!window.api,
  };
}
