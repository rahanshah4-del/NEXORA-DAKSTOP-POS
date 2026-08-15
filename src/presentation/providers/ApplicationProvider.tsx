/**
 * ApplicationProvider.tsx — Root provider that initializes the CQRS Application Layer.
 *
 * Creates the DI container, command/query dispatchers, and application context.
 * Wraps the entire app so all components can use useCommand() / useQuery() hooks.
 *
 * Usage:
 *   <ApplicationProvider db={database} deviceId="pos-1">
 *     <App />
 *   </ApplicationProvider>
 */

import React, { useState, useMemo, useCallback } from 'react';
import type Database from 'better-sqlite3';
import { buildContainer } from '../../application/di/registrations';
import {
  buildDefaultCommandRegistry,
  buildDefaultQueryRegistry,
} from '../../application/dispatcher/DispatcherRegistry';
import { CommandDispatcher } from '../../application/dispatcher/CommandDispatcher';
import { QueryDispatcher } from '../../application/dispatcher/QueryDispatcher';
import { ApplicationPipeline } from '../../application/common/ApplicationPipeline';
import { ApplicationContext } from '../../application/common/ApplicationContext';
import { NotificationDispatcher } from '../../application/services/NotificationDispatcher';
import { ApplicationLogger } from '../../application/services/ApplicationLogger';
import { ApplicationMetrics } from '../../application/services/ApplicationMetrics';
import { LoggingMiddleware } from '../../application/middleware/LoggingMiddleware';
import { PerformanceMiddleware } from '../../application/middleware/PerformanceMiddleware';
import { TransactionMiddleware } from '../../application/middleware/TransactionMiddleware';
import { UnitOfWorkFactory } from '../../application/common/UnitOfWork';
import { DI_TOKENS } from '../../application/di/ServiceCollection';
import {
  ApplicationReactContext,
  type IApplicationContextValue,
} from '../context/ApplicationContext';
import { NotificationProvider } from './NotificationProvider';

// ── Props ──

interface ApplicationProviderProps {
  /** The better-sqlite3 Database instance (from Electron main process). */
  db: Database.Database;

  /** Device identifier for this terminal. */
  deviceId?: string;

  /** Initial workspace/branch (defaults to 'default'/'main'). */
  workspaceId?: string;
  branchId?: string;

  children: React.ReactNode;
}

// ── Provider ──

export const ApplicationProvider: React.FC<ApplicationProviderProps> = ({
  db,
  deviceId = 'pos-terminal-1',
  workspaceId = 'default',
  branchId = 'main',
  children,
}) => {
  const [appContext, setAppContext] = useState<ApplicationContext>(() =>
    ApplicationContext.default().with({ deviceId, workspaceId, branchId }),
  );

  // Initialize the entire application layer ONCE
  const { container, commandDispatcher, queryDispatcher, notifications } =
    useMemo(() => {
      // 1. Build DI container
      const container = buildContainer(db);

      // 2. Build registries
      const commandRegistry = buildDefaultCommandRegistry();
      const queryRegistry = buildDefaultQueryRegistry();

      // 3. Build middleware pipeline
      const logger = container.resolve<ApplicationLogger>(DI_TOKENS.LOGGER);
      const metrics = container.resolve<ApplicationMetrics>(DI_TOKENS.METRICS);
      const uowFactory = container.resolve<UnitOfWorkFactory>(DI_TOKENS.UNIT_OF_WORK_FACTORY);

      const commandPipeline = new ApplicationPipeline()
        .use(new LoggingMiddleware(logger))
        .use(new TransactionMiddleware(uowFactory))
        .use(new PerformanceMiddleware(metrics));

      const queryPipeline = new ApplicationPipeline()
        .use(new LoggingMiddleware(logger))
        .use(new PerformanceMiddleware(metrics));

      // 4. Create dispatchers
      const commandDispatcher = new CommandDispatcher(
        commandRegistry,
        container,
        commandPipeline,
      );
      const queryDispatcher = new QueryDispatcher(
        queryRegistry,
        container,
        queryPipeline,
      );

      // 5. Get notification dispatcher
      const notifications = container.resolve<NotificationDispatcher>(
        DI_TOKENS.NOTIFICATION_DISPATCHER,
      );

      return { container, commandDispatcher, queryDispatcher, notifications };
    }, [db]);

  const handleSetAppContext = useCallback((ctx: ApplicationContext) => {
    setAppContext(ctx);
  }, []);

  const value: IApplicationContextValue = useMemo(
    () => ({
      commandDispatcher,
      queryDispatcher,
      container,
      appContext,
      notifications,
      isReady: true,
      setAppContext: handleSetAppContext,
    }),
    [
      commandDispatcher,
      queryDispatcher,
      container,
      appContext,
      notifications,
      handleSetAppContext,
    ],
  );

  return (
    <ApplicationReactContext.Provider value={value}>
      <NotificationProvider dispatcher={notifications}>
        {children}
      </NotificationProvider>
    </ApplicationReactContext.Provider>
  );
};
