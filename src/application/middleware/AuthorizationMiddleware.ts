/**
 * AuthorizationMiddleware.ts — Enforces access control on commands and queries.
 *
 * Priority: 200 (after validation, before business logic).
 * Checks permissions and roles against the current user in the context.
 */

import type { IMiddleware, PipelineDelegate } from '../common/ApplicationPipeline';
import type { IApplicationContext } from '../common/ApplicationContext';
import { Result, ErrorCode } from '../common/Result';
import { MiddlewarePriority } from '../common/ApplicationPipeline';

// ── Authorization Policy ──

export interface AuthorizationPolicy {
  /** Command or query type this policy applies to. */
  commandOrQueryType: string;

  /** Required permissions (ANY of these). */
  requiredPermissions: string[];

  /** Required roles (ANY of these). */
  requiredRoles: string[];

  /** Whether authentication is required. */
  requireAuth: boolean;
}

// ── Policy Registry ──

export class AuthorizationPolicyRegistry {
  private _policies = new Map<string, AuthorizationPolicy>();

  /** Register an authorization policy for a command/query type. */
  register(policy: AuthorizationPolicy): this {
    this._policies.set(policy.commandOrQueryType, policy);
    return this;
  }

  /** Register multiple policies at once. */
  registerAll(policies: AuthorizationPolicy[]): this {
    for (const policy of policies) {
      this._policies.set(policy.commandOrQueryType, policy);
    }
    return this;
  }

  /** Get the policy for a command/query type. */
  get(commandOrQueryType: string): AuthorizationPolicy | undefined {
    return this._policies.get(commandOrQueryType);
  }

  /** Register a default "require auth" policy for all command types. */
  registerDefault(types: string[]): this {
    for (const type of types) {
      if (!this._policies.has(type)) {
        this._policies.set(type, {
          commandOrQueryType: type,
          requiredPermissions: [],
          requiredRoles: [],
          requireAuth: true,
        });
      }
    }
    return this;
  }

  /** Mark certain types as public (no auth required). */
  registerPublic(types: string[]): this {
    for (const type of types) {
      this._policies.set(type, {
        commandOrQueryType: type,
        requiredPermissions: [],
        requiredRoles: [],
        requireAuth: false,
      });
    }
    return this;
  }
}

// ── Middleware ──

export class AuthorizationMiddleware implements IMiddleware {
  public readonly name = 'Authorization';
  public readonly priority = MiddlewarePriority.Authorization;

  constructor(private _policyRegistry: AuthorizationPolicyRegistry) {}

  async invoke<TResult>(
    context: IApplicationContext,
    commandOrQuery: unknown,
    next: PipelineDelegate<TResult>,
  ): Promise<Result<TResult>> {
    if (!commandOrQuery || typeof commandOrQuery !== 'object') {
      return next();
    }

    const cmdObj = commandOrQuery as Record<string, unknown>;
    const commandType =
      (cmdObj['__commandType'] as string) ??
      (commandOrQuery as object).constructor?.name;

    if (!commandType) {
      return next();
    }

    const policy = this._policyRegistry.get(commandType);
    if (!policy) {
      // No policy defined — allow by default
      return next();
    }

    // Check authentication
    if (policy.requireAuth && !context.isAuthenticated) {
      return Result.unauthorized();
    }

    // Check roles (ANY match)
    if (policy.requiredRoles.length > 0) {
      const hasRole = policy.requiredRoles.some((role) => context.hasRole(role));
      if (!hasRole) {
        return Result.forbidden(
          `Requires one of roles: ${policy.requiredRoles.join(', ')}`,
        );
      }
    }

    // Check permissions (ANY match)
    if (policy.requiredPermissions.length > 0) {
      const hasPermission = policy.requiredPermissions.some((perm) =>
        context.hasPermission(perm),
      );
      if (!hasPermission) {
        return Result.forbidden(
          `Requires one of permissions: ${policy.requiredPermissions.join(', ')}`,
        );
      }
    }

    return next();
  }
}
