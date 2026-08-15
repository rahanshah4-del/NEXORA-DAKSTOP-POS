/**
 * registrations.ts — Default service registrations for the Nexora POS application.
 *
 * Registers every repository, service, and infrastructure component
 * into the DI container. Called once at app startup.
 *
 * Architecture:
 *   UI → Dispatchers → Command/Query Handlers → Domain Services → Repositories → SQLite
 */

import Database from 'better-sqlite3';
import { ServiceCollection, ServiceLifetime, DI_TOKENS } from './ServiceCollection';
import { DependencyContainer } from './DependencyContainer';

// ── Repositories ──
import { SQLiteOrderRepository } from '../../repositories/sqlite/order-repository';
import { SQLiteCustomerRepository } from '../../repositories/sqlite/customer-repository';
import { SQLiteProductRepository } from '../../repositories/sqlite/product-repository';
import { SQLiteInventoryRepository } from '../../repositories/sqlite/inventory-repository';
import { SQLitePaymentRepository } from '../../repositories/sqlite/payment-repository';
import { SQLiteTableRepository } from '../../repositories/sqlite/table-repository';
import { SQLiteKitchenRepository } from '../../repositories/sqlite/kitchen-repository';
import { SQLiteStaffRepository } from '../../repositories/sqlite/staff-repository';
import { SQLiteSettingsRepository } from '../../repositories/sqlite/settings-repository';

// ── Application Services ──
import { ApplicationClock } from '../services/ApplicationClock';
import { ApplicationLogger } from '../services/ApplicationLogger';
import { ApplicationMetrics } from '../services/ApplicationMetrics';
import { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import { NotificationDispatcher } from '../services/NotificationDispatcher';
import { UnitOfWorkFactory } from '../common/UnitOfWork';

// ── Command Handlers ──
import { OrderCommandHandlers } from '../commands/OrderCommandHandlers';
import { ProductCommandHandlers } from '../commands/ProductCommandHandlers';
import { CustomerCommandHandlers } from '../commands/CustomerCommandHandlers';
import { InventoryCommandHandlers } from '../commands/InventoryCommandHandlers';
import { PaymentCommandHandlers } from '../commands/PaymentCommandHandlers';
import { KitchenCommandHandlers } from '../commands/KitchenCommandHandlers';
import { StaffCommandHandlers } from '../commands/StaffCommandHandlers';
import { SettingsCommandHandlers } from '../commands/SettingsCommandHandlers';
import { WorkspaceCommandHandlers } from '../commands/WorkspaceCommandHandlers';
import { BranchCommandHandlers } from '../commands/BranchCommandHandlers';
import { CounterCommandHandlers } from '../commands/CounterCommandHandlers';

// ── Query Handlers ──
import { OrderQueryHandlers } from '../queries/OrderQueryHandlers';
import { ProductQueryHandlers } from '../queries/ProductQueryHandlers';
import { CustomerQueryHandlers } from '../queries/CustomerQueryHandlers';
import { InventoryQueryHandlers } from '../queries/InventoryQueryHandlers';
import { KitchenQueryHandlers } from '../queries/KitchenQueryHandlers';
import { ReportQueryHandlers } from '../queries/ReportQueryHandlers';
import { SettingsQueryHandlers } from '../queries/SettingsQueryHandlers';
import { MiscQueryHandlers } from '../queries/MiscQueryHandlers';

// ── Build Service Collection ──

export function createServiceCollection(db: Database.Database): ServiceCollection {
  const services = new ServiceCollection();

  // ─── Infrastructure ───

  services.registerInstance(DI_TOKENS.DB, db);

  // ─── Repositories (Singletons — DB connection is shared) ───

  services
    .register(DI_TOKENS.ORDER_REPO, SQLiteOrderRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.CUSTOMER_REPO, SQLiteCustomerRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.PRODUCT_REPO, SQLiteProductRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.INVENTORY_REPO, SQLiteInventoryRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.PAYMENT_REPO, SQLitePaymentRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.TABLE_REPO, SQLiteTableRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.KITCHEN_REPO, SQLiteKitchenRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.STAFF_REPO, SQLiteStaffRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  services
    .register(DI_TOKENS.SETTINGS_REPO, SQLiteSettingsRepository, ServiceLifetime.Singleton, [DI_TOKENS.DB])
    .withTags('repo');

  // ─── Application Services (Singletons) ───

  services
    .register(DI_TOKENS.CLOCK, ApplicationClock, ServiceLifetime.Singleton)
    .withTags('app-service');

  services
    .register(DI_TOKENS.LOGGER, ApplicationLogger, ServiceLifetime.Singleton)
    .withTags('app-service');

  services
    .register(DI_TOKENS.METRICS, ApplicationMetrics, ServiceLifetime.Singleton)
    .withTags('app-service');

  services
    .register(DI_TOKENS.EVENT_DISPATCHER, DomainEventDispatcher, ServiceLifetime.Singleton, [
      DI_TOKENS.LOGGER,
    ])
    .withTags('app-service');

  services
    .register(DI_TOKENS.NOTIFICATION_DISPATCHER, NotificationDispatcher, ServiceLifetime.Singleton, [
      DI_TOKENS.LOGGER,
    ])
    .withTags('app-service');

  services
    .register(DI_TOKENS.UNIT_OF_WORK_FACTORY, UnitOfWorkFactory, ServiceLifetime.Scoped, [
      DI_TOKENS.DB,
    ])
    .withTags('app-service');

  // ─── Command Handlers (Singleton — stateless) ───

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'order',
      OrderCommandHandlers,
      ServiceLifetime.Singleton,
      [
        DI_TOKENS.ORDER_REPO,
        DI_TOKENS.TABLE_REPO,
        DI_TOKENS.CUSTOMER_REPO,
        DI_TOKENS.PRODUCT_REPO,
        DI_TOKENS.INVENTORY_REPO,
        DI_TOKENS.KITCHEN_REPO,
        DI_TOKENS.EVENT_DISPATCHER,
        DI_TOKENS.LOGGER,
      ],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'product',
      ProductCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.PRODUCT_REPO, DI_TOKENS.INVENTORY_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'customer',
      CustomerCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.CUSTOMER_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'inventory',
      InventoryCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.INVENTORY_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'payment',
      PaymentCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.PAYMENT_REPO, DI_TOKENS.ORDER_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'kitchen',
      KitchenCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.KITCHEN_REPO, DI_TOKENS.ORDER_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'staff',
      StaffCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.STAFF_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'settings',
      SettingsCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.SETTINGS_REPO, DI_TOKENS.EVENT_DISPATCHER, DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'workspace',
      WorkspaceCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'branch',
      BranchCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  services
    .register(
      DI_TOKENS.CMD_HANDLER_PREFIX + 'counter',
      CounterCommandHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.LOGGER],
    )
    .withTags('cmd-handler');

  // ─── Query Handlers (Singleton — stateless) ───

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'order',
      OrderQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.ORDER_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'product',
      ProductQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.PRODUCT_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'customer',
      CustomerQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.CUSTOMER_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'inventory',
      InventoryQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.INVENTORY_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'kitchen',
      KitchenQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.KITCHEN_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'report',
      ReportQueryHandlers,
      ServiceLifetime.Singleton,
      [
        DI_TOKENS.ORDER_REPO,
        DI_TOKENS.PRODUCT_REPO,
        DI_TOKENS.PAYMENT_REPO,
        DI_TOKENS.INVENTORY_REPO,
        DI_TOKENS.STAFF_REPO,
        DI_TOKENS.CUSTOMER_REPO,
        DI_TOKENS.LOGGER,
      ],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'settings',
      SettingsQueryHandlers,
      ServiceLifetime.Singleton,
      [DI_TOKENS.SETTINGS_REPO, DI_TOKENS.LOGGER],
    )
    .withTags('qry-handler');

  services
    .register(
      DI_TOKENS.QUERY_HANDLER_PREFIX + 'misc',
      MiscQueryHandlers,
      ServiceLifetime.Singleton,
      [
        DI_TOKENS.ORDER_REPO,
        DI_TOKENS.STAFF_REPO,
        DI_TOKENS.TABLE_REPO,
        DI_TOKENS.PAYMENT_REPO,
        DI_TOKENS.SETTINGS_REPO,
        DI_TOKENS.LOGGER,
      ],
    )
    .withTags('qry-handler');

  return services;
}

/**
 * Create a fully-built DependencyContainer ready for use.
 *
 * @param db The better-sqlite3 Database instance.
 * @returns A built DependencyContainer.
 */
export function buildContainer(db: Database.Database): DependencyContainer {
  const services = createServiceCollection(db);
  const container = new DependencyContainer(services);
  container.build();
  return container;
}
