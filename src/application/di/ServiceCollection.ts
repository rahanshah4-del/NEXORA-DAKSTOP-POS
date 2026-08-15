/**
 * ServiceCollection.ts — Service registration API for the DI container.
 *
 * Fluent API for registering services with lifetime management:
 *   - Singleton: One instance for the container lifetime
 *   - Scoped: One instance per scope (request / unit-of-work)
 *   - Transient: New instance every time
 */

// ── Service Lifetime ──

export enum ServiceLifetime {
  Singleton = 'singleton',
  Scoped = 'scoped',
  Transient = 'transient',
}

// ── Service Descriptor ──

export interface ServiceDescriptor<T = unknown> {
  /** The token used for resolution (typically the interface/symbol). */
  token: string;

  /** The concrete implementation class or factory. */
  implementation: (new (...args: unknown[]) => T) | ((...args: unknown[]) => T);

  /** Lifetime of the service. */
  lifetime: ServiceLifetime;

  /** Dependencies — token strings for constructor parameters. */
  dependencies: string[];

  /** Optional instance (for pre-created singletons). */
  instance?: T;

  /** Optional tags for grouped resolution. */
  tags: string[];
}

// ── Service Collection ──

export class ServiceCollection {
  private _descriptors = new Map<string, ServiceDescriptor>();

  /** Register a service with its implementation class. */
  register<T>(
    token: string,
    implementation: new (...args: unknown[]) => T,
    lifetime: ServiceLifetime = ServiceLifetime.Transient,
    dependencies: string[] = [],
  ): this {
    this._descriptors.set(token, {
      token,
      implementation,
      lifetime,
      dependencies,
      tags: [],
    });
    return this;
  }

  /** Register a singleton with a pre-created instance. */
  registerInstance<T>(token: string, instance: T): this {
    this._descriptors.set(token, {
      token,
      implementation: (() => instance) as unknown as new (...args: unknown[]) => T,
      lifetime: ServiceLifetime.Singleton,
      dependencies: [],
      instance,
      tags: [],
    });
    return this;
  }

  /** Register a factory function. */
  registerFactory<T>(
    token: string,
    factory: (...args: unknown[]) => T,
    lifetime: ServiceLifetime = ServiceLifetime.Transient,
    dependencies: string[] = [],
  ): this {
    this._descriptors.set(token, {
      token,
      implementation: factory as unknown as new (...args: unknown[]) => T,
      lifetime,
      dependencies,
      tags: [],
    });
    return this;
  }

  /** Add tags to the last registered service. */
  withTags(...tags: string[]): this {
    const lastEntry = Array.from(this._descriptors.values()).pop();
    if (lastEntry) {
      lastEntry.tags.push(...tags);
    }
    return this;
  }

  /** Try to get a descriptor by token. */
  get(token: string): ServiceDescriptor | undefined {
    return this._descriptors.get(token);
  }

  /** Check if a token is registered. */
  has(token: string): boolean {
    return this._descriptors.has(token);
  }

  /** Get all registered tokens. */
  get tokens(): string[] {
    return Array.from(this._descriptors.keys());
  }

  /** Get all descriptors. */
  get descriptors(): ReadonlyMap<string, ServiceDescriptor> {
    return this._descriptors;
  }

  /** Get descriptors filtered by tag. */
  getByTag(tag: string): ServiceDescriptor[] {
    return Array.from(this._descriptors.values()).filter((d) => d.tags.includes(tag));
  }

  /** Get descriptors filtered by lifetime. */
  getByLifetime(lifetime: ServiceLifetime): ServiceDescriptor[] {
    return Array.from(this._descriptors.values()).filter((d) => d.lifetime === lifetime);
  }
}

// ── Service Token Constants ──

/** Standardized token naming convention. All DI tokens exported from here. */
export const DI_TOKENS = {
  // Infrastructure
  DB: 'db',
  APPLICATION_CONTEXT: 'app.context',

  // Repositories
  ORDER_REPO: 'repo.order',
  CUSTOMER_REPO: 'repo.customer',
  PRODUCT_REPO: 'repo.product',
  INVENTORY_REPO: 'repo.inventory',
  PAYMENT_REPO: 'repo.payment',
  TABLE_REPO: 'repo.table',
  KITCHEN_REPO: 'repo.kitchen',
  STAFF_REPO: 'repo.staff',
  SETTINGS_REPO: 'repo.settings',

  // Domain Services
  ORDER_SERVICE: 'svc.order',
  CUSTOMER_SERVICE: 'svc.customer',
  PRODUCT_SERVICE: 'svc.product',
  INVENTORY_SERVICE: 'svc.inventory',
  PAYMENT_SERVICE: 'svc.payment',
  TABLE_SERVICE: 'svc.table',
  KITCHEN_SERVICE: 'svc.kitchen',
  STAFF_SERVICE: 'svc.staff',
  SETTINGS_SERVICE: 'svc.settings',
  REPORT_SERVICE: 'svc.report',
  RESERVATION_SERVICE: 'svc.reservation',
  LOYALTY_SERVICE: 'svc.loyalty',
  DELIVERY_SERVICE: 'svc.delivery',
  PRINTER_SERVICE: 'svc.printer',
  WORKSPACE_SERVICE: 'svc.workspace',
  BRANCH_SERVICE: 'svc.branch',
  COUNTER_SERVICE: 'svc.counter',
  BACKUP_SERVICE: 'svc.backup',
  SYNC_SERVICE: 'svc.sync',
  AUTH_SERVICE: 'svc.auth',

  // Application Services
  CLOCK: 'app.clock',
  LOGGER: 'app.logger',
  METRICS: 'app.metrics',
  EVENT_DISPATCHER: 'app.eventDispatcher',
  NOTIFICATION_DISPATCHER: 'app.notificationDispatcher',
  UNIT_OF_WORK_FACTORY: 'app.uowFactory',

  // Sync
  SYNC_MANAGER: 'sync.manager',
  SYNC_QUEUE: 'sync.queue',
  EVENT_BUS: 'sync.eventBus',

  // Command Handlers
  CMD_HANDLER_PREFIX: 'cmd.',
  // Query Handlers
  QUERY_HANDLER_PREFIX: 'qry.',
} as const;
