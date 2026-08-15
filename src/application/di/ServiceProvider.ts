/**
 * ServiceProvider.ts — Service resolution engine.
 *
 * Resolves services from a ServiceCollection, respecting lifetimes:
 *   - Singleton: created once, cached forever
 *   - Scoped: created once per scope, cached within scope
 *   - Transient: created new every time
 */

import { ServiceCollection, ServiceLifetime, type ServiceDescriptor } from './ServiceCollection';

// ── Service Provider ──

export class ServiceProvider {
  private _singletons = new Map<string, unknown>();
  private _scopedInstances = new Map<string, Map<string, unknown>>();
  private _scopes = new Map<string, Map<string, unknown>>();

  constructor(private _collection: ServiceCollection) {}

  /** Create a new scope (for request / unit-of-work isolation). */
  createScope(scopeId: string): void {
    const instances = new Map<string, unknown>();
    this._scopedInstances.set(scopeId, instances);
    this._scopes.set(scopeId, instances);
  }

  /** Destroy a scope and all its scoped instances. */
  destroyScope(scopeId: string): void {
    this._scopedInstances.delete(scopeId);
    this._scopes.delete(scopeId);
  }

  /**
   * Resolve a service by token.
   *
   * @param token   The registration token.
   * @param scopeId Optional scope ID for scoped services.
   * @returns The resolved service instance.
   * @throws If the token is not registered.
   */
  resolve<T>(token: string, scopeId?: string): T {
    const descriptor = this._collection.get(token);
    if (!descriptor) {
      throw new Error(`Service not registered: ${token}`);
    }
    return this._resolveDescriptor<T>(descriptor, scopeId);
  }

  /**
   * Resolve all services with a given tag.
   */
  resolveTagged<T>(tag: string, scopeId?: string): T[] {
    const descriptors = this._collection.getByTag(tag);
    return descriptors.map((d) => this._resolveDescriptor<T>(d, scopeId));
  }

  /**
   * Try to resolve a service, returning null if not registered.
   */
  tryResolve<T>(token: string, scopeId?: string): T | null {
    const descriptor = this._collection.get(token);
    if (!descriptor) return null;
    return this._resolveDescriptor<T>(descriptor, scopeId);
  }

  private _resolveDescriptor<T>(descriptor: ServiceDescriptor, scopeId?: string): T {
    switch (descriptor.lifetime) {
      case ServiceLifetime.Singleton:
        return this._resolveSingleton<T>(descriptor);

      case ServiceLifetime.Scoped:
        return this._resolveScoped<T>(descriptor, scopeId);

      case ServiceLifetime.Transient:
        return this._resolveTransient<T>(descriptor, scopeId);

      default:
        throw new Error(`Unknown lifetime: ${descriptor.lifetime}`);
    }
  }

  private _resolveSingleton<T>(descriptor: ServiceDescriptor): T {
    if (this._singletons.has(descriptor.token)) {
      return this._singletons.get(descriptor.token) as T;
    }

    if (descriptor.instance) {
      this._singletons.set(descriptor.token, descriptor.instance);
      return descriptor.instance as T;
    }

    const instance = this._createInstance<T>(descriptor);
    this._singletons.set(descriptor.token, instance);
    return instance;
  }

  private _resolveScoped<T>(descriptor: ServiceDescriptor, scopeId?: string): T {
    const id = scopeId ?? '__default_scope__';

    let scope = this._scopedInstances.get(id);
    if (!scope) {
      // Auto-create default scope
      scope = new Map();
      this._scopedInstances.set(id, scope);
    }

    if (scope.has(descriptor.token)) {
      return scope.get(descriptor.token) as T;
    }

    if (descriptor.instance) {
      // Pre-created instances act as singletons even for "scoped" registrations
      scope.set(descriptor.token, descriptor.instance);
      return descriptor.instance as T;
    }

    const instance = this._createInstance<T>(descriptor, scopeId);
    scope.set(descriptor.token, instance);
    return instance;
  }

  private _resolveTransient<T>(descriptor: ServiceDescriptor, scopeId?: string): T {
    return this._createInstance<T>(descriptor, scopeId);
  }

  private _createInstance<T>(descriptor: ServiceDescriptor, scopeId?: string): T {
    if (descriptor.dependencies.length === 0) {
      // No dependencies — simple construction
      const ctor = descriptor.implementation as new () => T;
      try {
        return new ctor();
      } catch {
        // Might be a factory function with no args
        const factory = descriptor.implementation as () => T;
        return factory();
      }
    }

    // Resolve dependencies
    const deps = descriptor.dependencies.map((dep) => this.resolve(dep, scopeId));

    // Try constructor first, then factory
    try {
      const Ctor = descriptor.implementation as new (...args: unknown[]) => T;
      return new Ctor(...deps);
    } catch {
      const factory = descriptor.implementation as (...args: unknown[]) => T;
      return factory(...deps);
    }
  }

  /** Check if a token is registered. */
  has(token: string): boolean {
    return this._collection.has(token);
  }

  /** Get the underlying service collection. */
  get collection(): ServiceCollection {
    return this._collection;
  }
}
