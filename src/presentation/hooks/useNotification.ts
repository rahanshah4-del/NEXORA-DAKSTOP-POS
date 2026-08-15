/**
 * useNotification.ts — Fire UI notifications from any component.
 *
 * Usage:
 *   const { success, error, warning, info } = useNotification();
 *   success('Order Created', 'Order #42 has been placed');
 */

import { useContext } from 'react';
import { NotificationReactContext, type INotificationContextValue } from '../context/NotificationContext';

export function useNotification(): INotificationContextValue {
  const ctx = useContext(NotificationReactContext);
  if (!ctx) {
    throw new Error(
      'useNotification() must be used within a <NotificationProvider>. ' +
      'Wrap your app in <ApplicationProvider db={database}> first.',
    );
  }
  return ctx;
}
