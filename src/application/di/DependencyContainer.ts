/**
 * DependencyContainer.ts — Top-level DI container facade.
 *
 * Provides a simplified API over ServiceCollection + ServiceProvider:
 *   - Build the container once at app startup
 *   - Resolve services at runtime
 *   - Create scopes for request isolation
 */

import { ServiceCollection, ServiceLifetime } from './ServiceCollection';
import { ServiceProvider } from './ServiceProvider';

export class DependencyContainer {
  private _provider: ServiceProvider;
  private _built = false;

  constructor(private _collection: ServiceCollection) {
    this._provider = new ServiceProvider(this._collection);
  }

  /** Build the container (validates all registrations). Call once. */
  build(): void {
    if (this._built) {
      throw new Error('DependencyContainer has already been built');
    }

    // Validate all descriptors have resolvable dependencies
    for (const [token, descriptor] of this._collection.descriptors) {
      for (const dep of descriptor.dependencies) {
        if (!this._collection.has(dep)) {
          throw new Error(
            `Dependency '${dep}' required by '${token}' is not registered`,
          );
        }
      }
    }

    this._built = true;
  }

  /** Resolve a service by token. */
  resolve<T>(token: string): T {
    this._ensureBuilt();
    return this._provider.resolve<T>(token);
  }

  /** Try to resolve a service, returning null if not registered. */
  tryResolve<T>(token: string): T | null {
    this._ensureBuilt();
    return this._provider.tryResolve<T>(token);
  }

  /** Resolve all services with a given tag. */
  resolveTagged<T>(tag: string): T[] {
    this._ensureBuilt();
    return this._provider.resolveTagged<T>(tag);
  }

  /** Create a scoped service provider (for request / UoW isolation). */
  createScope(scopeId: string): ServiceProvider {
    this._ensureBuilt();
    const scopeProvider = new ServiceProvider(this._collection);
    scopeProvider.createScope(scopeId);
    return scopeProvider;
  }

  /** Check if a token is registered. */
  has(token: string): boolean {
    return this._collection.has(token);
  }

  /** Get the underlying service collection (for inspection). */
  get collection(): ServiceCollection {
    return this._collection;
  }

  /** Get the underlying service provider. */
  get provider(): ServiceProvider {
    this._ensureBuilt();
    return this._provider;
  }

  get isBuilt(): boolean {
    return this._built;
  }

  private _ensureBuilt(): void {
    if (!this._built) {
      throw new Error(
        'DependencyContainer has not been built. Call container.build() first.',
      );
    }
  }
}
