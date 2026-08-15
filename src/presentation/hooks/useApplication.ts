/**
 * useApplication.ts — Access the application context from any component.
 *
 * Returns the full IApplicationContextValue: dispatchers, app context, DI container.
 *
 * Usage:
 *   const { commandDispatcher, queryDispatcher, appContext, isReady } = useApplication();
 */

import { useContext } from 'react';
import { ApplicationReactContext, type IApplicationContextValue } from '../context/ApplicationContext';

/** Access the full application context. Throws if used outside <ApplicationProvider>. */
export function useApplication(): IApplicationContextValue {
  const ctx = useContext(ApplicationReactContext);
  if (!ctx) {
    throw new Error(
      'useApplication() must be used within an <ApplicationProvider>. ' +
      'Wrap your app in <ApplicationProvider db={database}> first.',
    );
  }
  return ctx;
}

/** Access only the application context (workspace, user, etc.). */
export function useAppContext() {
  const { appContext, setAppContext } = useApplication();
  return { appContext, setAppContext };
}

/** Check if the application layer is initialized. */
export function useIsReady(): boolean {
  const { isReady } = useApplication();
  return isReady;
}
