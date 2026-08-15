/**
 * ApplicationContext.ts — Runtime context propagated through every request.
 *
 * Provides workspace, branch, device, user, and tracing metadata
 * that commands, queries, and middleware need without reaching into global state.
 */

import type { UserRole } from '../../types/enums';

// ── Context Shape ──

export interface IApplicationContext {
  /** Current workspace identifier. */
  readonly workspaceId: string;

  /** Current branch identifier. */
  readonly branchId: string;

  /** Current physical/logical device identifier. */
  readonly deviceId: string;

  /** Active POS counter identifier (null if no counter open). */
  readonly counterId: string | null;

  /** Currently authenticated user (null if not logged in). */
  readonly currentUser: ICurrentUser | null;

  /** Active shift identifier (null if not clocked in). */
  readonly currentShiftId: string | null;

  /** Set of permission keys the current user holds. */
  readonly permissions: ReadonlySet<string>;

  /** Locale string (e.g. 'en-US'). */
  readonly locale: string;

  /** IANA timezone (e.g. 'America/New_York'). */
  readonly timezone: string;

  /** Correlation ID for distributed tracing across requests. */
  readonly correlationId: string;

  /** Unique request identifier (UUID). */
  readonly requestId: string;

  /** Active sync session identifier (null if not syncing). */
  readonly syncSessionId: string | null;

  /** UTC timestamp when this context was created. */
  readonly createdAt: string;
}

// ── Current User ──

export interface ICurrentUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string | null;
  readonly role: UserRole;
  readonly employeeId: string | null;
}

// ── Context Builder ──

let _counter = 0;

function nextRequestId(): string {
  _counter += 1;
  return `req_${Date.now()}_${_counter}`;
}

export class ApplicationContext implements IApplicationContext {
  public readonly requestId = nextRequestId();
  public readonly createdAt = new Date().toISOString();

  constructor(
    public readonly workspaceId: string = 'default',
    public readonly branchId: string = 'main',
    public readonly deviceId: string = 'device-unknown',
    public readonly counterId: string | null = null,
    public readonly currentUser: ICurrentUser | null = null,
    public readonly currentShiftId: string | null = null,
    public readonly permissions: ReadonlySet<string> = new Set(),
    public readonly locale: string = 'en-US',
    public readonly timezone: string = 'UTC',
    public readonly correlationId: string = '',
    public readonly syncSessionId: string | null = null,
  ) {}

  // ── Factory ──

  /** Create a minimal default context (useful for bootstrapping). */
  static default(): ApplicationContext {
    return new ApplicationContext();
  }

  /** Create a context for a specific user. */
  static forUser(
    user: ICurrentUser,
    deviceId: string,
    overrides: Partial<IApplicationContext> = {},
  ): ApplicationContext {
    return new ApplicationContext(
      overrides.workspaceId ?? 'default',
      overrides.branchId ?? 'main',
      deviceId,
      overrides.counterId ?? null,
      user,
      overrides.currentShiftId ?? null,
      overrides.permissions ?? new Set(),
      overrides.locale ?? 'en-US',
      overrides.timezone ?? 'UTC',
      overrides.correlationId ?? '',
      overrides.syncSessionId ?? null,
    );
  }

  /** Derive a new context with some fields changed. */
  with(overrides: Partial<IApplicationContext>): ApplicationContext {
    return new ApplicationContext(
      overrides.workspaceId ?? this.workspaceId,
      overrides.branchId ?? this.branchId,
      overrides.deviceId ?? this.deviceId,
      overrides.counterId ?? this.counterId,
      overrides.currentUser ?? this.currentUser,
      overrides.currentShiftId ?? this.currentShiftId,
      overrides.permissions ?? this.permissions,
      overrides.locale ?? this.locale,
      overrides.timezone ?? this.timezone,
      overrides.correlationId ?? this.correlationId,
      overrides.requestId ?? this.requestId,
      overrides.syncSessionId ?? this.syncSessionId,
    );
  }

  /** Check if the current user has a specific permission. */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    if (this.currentUser.role === 'admin') return true; // admin bypass
    return this.permissions.has(permission);
  }

  /** Check if the current user has a specific role. */
  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  /** Check if the user is authenticated. */
  get isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /** Check if there's an active shift. */
  get isClockedIn(): boolean {
    return this.currentShiftId !== null;
  }

  /** Check if a counter is open. */
  get isCounterOpen(): boolean {
    return this.counterId !== null;
  }
}
