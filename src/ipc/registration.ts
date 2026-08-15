/**
 * registration.ts — Registers all restaurant IPC handlers at app startup.
 *
 * Import and call once from the main process after the DB and DI container
 * are initialized:
 *
 *   import { registerRestaurantIpcHandlers } from './ipc/registration';
 *   registerRestaurantIpcHandlers(container);
 *
 * Registers ipcMain.handle() for all 76 restaurant channels.
 * Handlers are registered only ONCE — duplicate registration is prevented.
 */

import type { DependencyContainer } from '../application/di/DependencyContainer';
import type { CommandDispatcher } from '../application/dispatcher/CommandDispatcher';
import type { QueryDispatcher } from '../application/dispatcher/QueryDispatcher';
import { ApplicationContext } from '../application/common/ApplicationContext';
import { DI_TOKENS } from '../application/di/ServiceCollection';

// ── Handler Modules ──
import { registerOrderHandlers } from './handlers/order-handlers';
import { registerProductHandlers } from './handlers/product-handlers';
import { registerCustomerHandlers } from './handlers/customer-handlers';
import { registerTableHandlers } from './handlers/table-handlers';
import { registerPaymentHandlers } from './handlers/payment-handlers';
import { registerKitchenHandlers } from './handlers/kitchen-handlers';
import { registerStaffHandlers } from './handlers/staff-handlers';
import { registerSettingsHandlers } from './handlers/settings-handlers';
import { registerReportHandlers } from './handlers/report-handlers';

// ── Registration State ──

let _registered = false;
let _appContext: ApplicationContext = ApplicationContext.default();

/**
 * Register ALL restaurant IPC handlers.
 *
 * @param container The built DependencyContainer.
 * @param deviceId  Optional device identifier for the application context.
 * @param workspaceId Optional workspace identifier.
 * @param branchId   Optional branch identifier.
 *
 * Throws if called more than once (duplicate registration prevention).
 */
export function registerRestaurantIpcHandlers(
  container: DependencyContainer,
  deviceId: string = 'pos-terminal-1',
  workspaceId: string = 'default',
  branchId: string = 'main',
): void {
  if (_registered) {
    throw new Error(
      'Restaurant IPC handlers are already registered. ' +
      'Call registerRestaurantIpcHandlers() only once during app startup.',
    );
  }

  // Initialize application context
  _appContext = ApplicationContext.default().with({ deviceId, workspaceId, branchId });

  // Resolve dispatchers from the DI container
  const commandDispatcher = container.resolve<CommandDispatcher>(
    'cmd.dispatcher',
  );

  // Reconstruct dispatchers if they're not registered in the container
  // (they were created by ApplicationProvider, which runs in the renderer)
  // In the main process, we create them from the container's registered handlers
  const { CommandDispatcher } = require('../application/dispatcher/CommandDispatcher');
  const { QueryDispatcher } = require('../application/dispatcher/QueryDispatcher');
  const { ApplicationPipeline } = require('../application/common/ApplicationPipeline');
  const { LoggingMiddleware } = require('../application/middleware/LoggingMiddleware');
  const { PerformanceMiddleware } = require('../application/middleware/PerformanceMiddleware');
  const { TransactionMiddleware } = require('../application/middleware/TransactionMiddleware');
  const { UnitOfWorkFactory } = require('../application/common/UnitOfWork');
  const { ApplicationLogger } = require('../application/services/ApplicationLogger');
  const { ApplicationMetrics } = require('../application/services/ApplicationMetrics');
  const {
    buildDefaultCommandRegistry,
    buildDefaultQueryRegistry,
  } = require('../application/dispatcher/DispatcherRegistry');

  const logger = container.resolve<InstanceType<typeof ApplicationLogger>>(DI_TOKENS.LOGGER);
  const metrics = container.resolve<InstanceType<typeof ApplicationMetrics>>(DI_TOKENS.METRICS);
  const uowFactory = container.resolve<InstanceType<typeof UnitOfWorkFactory>>(DI_TOKENS.UNIT_OF_WORK_FACTORY);

  const commandPipeline = new ApplicationPipeline()
    .use(new LoggingMiddleware(logger))
    .use(new TransactionMiddleware(uowFactory))
    .use(new PerformanceMiddleware(metrics));

  const queryPipeline = new ApplicationPipeline()
    .use(new LoggingMiddleware(logger))
    .use(new PerformanceMiddleware(metrics));

  const cmdDispatcher = new CommandDispatcher(
    buildDefaultCommandRegistry(),
    container,
    commandPipeline,
  );

  const qryDispatcher = new QueryDispatcher(
    buildDefaultQueryRegistry(),
    container,
    queryPipeline,
  );

  const getContext = (): ApplicationContext => _appContext;

  // Register all entity handlers
  registerOrderHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerProductHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerCustomerHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerTableHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerPaymentHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerKitchenHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerStaffHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerSettingsHandlers(cmdDispatcher, qryDispatcher, getContext);
  registerReportHandlers(qryDispatcher, getContext);

  _registered = true;
}

/**
 * Update the application context (e.g., after login or branch switch).
 */
export function updateRestaurantAppContext(ctx: ApplicationContext): void {
  _appContext = ctx;
}

/**
 * Get the current application context.
 */
export function getRestaurantAppContext(): ApplicationContext {
  return _appContext;
}

/**
 * Check if handlers have been registered.
 */
export function isRestaurantHandlersRegistered(): boolean {
  return _registered;
}
