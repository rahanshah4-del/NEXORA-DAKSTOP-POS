/**
 * ICommandHandler.ts — Generic command handler contract for the CQRS command side.
 *
 * A command handler receives a command (data + metadata) and produces a Result<T>.
 * It orchestrates domain services and repositories to execute the use case.
 */

import type { Result } from './Result';
import type { IApplicationContext } from './ApplicationContext';

// ── Command Handler Interface ──

/**
 * ICommandHandler<TCommand, TResult>
 *
 * Implementations receive a command + context, execute the use case
 * (coordinating domain services and repositories), and return a Result.
 *
 * @typeParam TCommand  - The command DTO (must extend ICommand from domain).
 * @typeParam TResult   - The entity or value produced on success.
 */
export interface ICommandHandler<TCommand, TResult = void> {
  /** Unique command type this handler processes. */
  readonly commandType: string;

  /**
   * Execute the command.
   *
   * @param command The command payload.
   * @param context The application context (user, workspace, etc.).
   * @returns Result containing the created/updated entity or void.
   */
  execute(command: TCommand, context: IApplicationContext): Promise<Result<TResult>>;
}

// ── Command Handler Metadata ──

export interface CommandHandlerMetadata {
  commandType: string;
  handlerName: string;
  requiresAuth: boolean;
  requiredPermissions: string[];
  requiredRoles: string[];
  description: string;
}

/** Decorator-style metadata helper for command handlers. */
export function CommandHandlerMeta(
  metadata: Partial<CommandHandlerMetadata> & { commandType: string },
): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata('command:type', metadata.commandType, target);
    Reflect.defineMetadata('command:auth', metadata.requiresAuth ?? true, target);
    Reflect.defineMetadata('command:permissions', metadata.requiredPermissions ?? [], target);
    Reflect.defineMetadata('command:roles', metadata.requiredRoles ?? [], target);
  };
}
