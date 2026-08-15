/**
 * Application Layer — barrel export for the entire CQRS application framework.
 *
 * Architecture:
 *   UI → Application Layer → Domain Layer → Repository Layer → SQLite → Sync Queue
 *
 * This module exports everything needed to wire up the application:
 *   - Common types (Result, Errors, Context, Pipeline, UoW)
 *   - DI container (ServiceCollection, ServiceProvider, DependencyContainer)
 *   - Dispatchers (CommandDispatcher, QueryDispatcher, DispatcherRegistry)
 *   - Middleware (Validation, Authorization, Logging, Transaction, Performance)
 *   - Command Handlers (all 11 entities)
 *   - Query Handlers (all 8 categories)
 *   - Application Services (Clock, Logger, Metrics, Events, Notifications)
 *   - Registration helpers (buildContainer, createServiceCollection)
 */

// ── Common ──
export {
  Result,
  ErrorCode,
  type ValidationError,
  type ValidationWarning,
} from './common/Result';

export {
  ApplicationError,
  ValidationException,
  AuthorizationException,
  NotFoundException,
  ConflictException,
  BusinessRuleException,
  InfrastructureException,
  DatabaseException,
  VersionMismatchException,
  InvalidStateTransitionException,
  InsufficientStockException,
} from './common/Errors';

export {
  ApplicationContext,
  type IApplicationContext,
  type ICurrentUser,
} from './common/ApplicationContext';

export type {
  ICommandHandler,
  CommandHandlerMetadata,
} from './common/ICommandHandler';

export type {
  IQueryHandler,
  PaginatedResult,
  QueryHandlerMetadata,
} from './common/IQueryHandler';

export type {
  IApplicationService,
  IClock,
  ILogger,
  IMetrics,
  ApplicationMetricsSnapshot,
} from './common/IApplicationService';

export {
  UnitOfWork,
  UnitOfWorkFactory,
  type IUnitOfWork,
  type IUnitOfWorkFactory,
} from './common/UnitOfWork';

export {
  TransactionScope,
  executeInTransaction,
  type ITransactionScope,
} from './common/TransactionScope';

export {
  ApplicationPipeline,
  MiddlewarePriority,
  type IMiddleware,
  type PipelineDelegate,
} from './common/ApplicationPipeline';

// ── DI ──
export {
  ServiceCollection,
  ServiceLifetime,
  DI_TOKENS,
  type ServiceDescriptor,
} from './di/ServiceCollection';

export { ServiceProvider } from './di/ServiceProvider';
export { DependencyContainer } from './di/DependencyContainer';
export {
  createServiceCollection,
  buildContainer,
} from './di/registrations';

// ── Dispatchers ──
export {
  DispatcherRegistry,
  buildDefaultCommandRegistry,
  buildDefaultQueryRegistry,
  type HandlerEntry,
} from './dispatcher/DispatcherRegistry';

export { CommandDispatcher } from './dispatcher/CommandDispatcher';
export { QueryDispatcher } from './dispatcher/QueryDispatcher';

// ── Middleware ──
export {
  ValidationMiddleware,
  CommandValidatorRegistry,
  type ValidationRule,
} from './middleware/ValidationMiddleware';

export {
  AuthorizationMiddleware,
  AuthorizationPolicyRegistry,
  type AuthorizationPolicy,
} from './middleware/AuthorizationMiddleware';

export { LoggingMiddleware } from './middleware/LoggingMiddleware';
export { TransactionMiddleware } from './middleware/TransactionMiddleware';
export { PerformanceMiddleware } from './middleware/PerformanceMiddleware';

// ── Command Handlers ──
export { OrderCommandHandlers } from './commands/OrderCommandHandlers';
export { ProductCommandHandlers } from './commands/ProductCommandHandlers';
export { CustomerCommandHandlers } from './commands/CustomerCommandHandlers';
export { InventoryCommandHandlers } from './commands/InventoryCommandHandlers';
export { PaymentCommandHandlers } from './commands/PaymentCommandHandlers';
export { KitchenCommandHandlers } from './commands/KitchenCommandHandlers';
export { StaffCommandHandlers } from './commands/StaffCommandHandlers';
export { SettingsCommandHandlers } from './commands/SettingsCommandHandlers';
export { WorkspaceCommandHandlers } from './commands/WorkspaceCommandHandlers';
export { BranchCommandHandlers } from './commands/BranchCommandHandlers';
export { CounterCommandHandlers } from './commands/CounterCommandHandlers';

// ── Query Handlers ──
export { OrderQueryHandlers } from './queries/OrderQueryHandlers';
export { ProductQueryHandlers } from './queries/ProductQueryHandlers';
export { CustomerQueryHandlers } from './queries/CustomerQueryHandlers';
export { InventoryQueryHandlers } from './queries/InventoryQueryHandlers';
export { KitchenQueryHandlers } from './queries/KitchenQueryHandlers';
export { ReportQueryHandlers } from './queries/ReportQueryHandlers';
export { SettingsQueryHandlers } from './queries/SettingsQueryHandlers';
export { MiscQueryHandlers } from './queries/MiscQueryHandlers';

// ── Application Services ──
export { ApplicationClock } from './services/ApplicationClock';
export { ApplicationLogger } from './services/ApplicationLogger';
export { ApplicationMetrics } from './services/ApplicationMetrics';
export { DomainEventDispatcher } from './services/DomainEventDispatcher';
export {
  NotificationDispatcher,
  type Notification,
} from './services/NotificationDispatcher';
