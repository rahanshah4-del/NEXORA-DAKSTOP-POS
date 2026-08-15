/**
 * ApplicationContext.ts — React Context for the CQRS Application Layer.
 *
 * Provides CommandDispatcher, QueryDispatcher, and ApplicationContext
 * to all presentation components via React Context + hooks.
 *
 * No prop drilling. No Redux. Pure React Context + Hooks.
 */

import { createContext } from 'react';
import type { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import type { DependencyContainer } from '../../application/di/DependencyContainer';
import type { ApplicationContext as AppCtx } from '../../application/common/ApplicationContext';
import type { NotificationDispatcher } from '../../application/services/NotificationDispatcher';

// ── Context Value Shape ──

export interface IApplicationContextValue {
  /** CQRS Command Dispatcher (mutations). */
  commandDispatcher: CommandDispatcher;

  /** CQRS Query Dispatcher (reads). */
  queryDispatcher: QueryDispatcher;

  /** DI Container (for advanced use). */
  container: DependencyContainer;

  /** Current application context (user, workspace, branch, etc.). */
  appContext: AppCtx;

  /** Notification dispatcher for UI alerts. */
  notifications: NotificationDispatcher;

  /** Whether the application layer is initialized and ready. */
  isReady: boolean;

  /** Update the application context (e.g., after login or branch switch). */
  setAppContext: (ctx: AppCtx) => void;
}

// ── React Context ──

export const ApplicationReactContext = createContext<IApplicationContextValue | null>(null);
ApplicationReactContext.displayName = 'ApplicationContext';
