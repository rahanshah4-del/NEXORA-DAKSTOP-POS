/**
 * WorkspaceCommandHandlers.ts — Command handlers for Workspace commands.
 *
 * Note: Full workspace management requires a cloud backend.
 * These handlers operate on local state only.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { ILogger } from '../common/IApplicationService';

export class WorkspaceCommandHandlers {
  constructor(private _logger: ILogger) {}

  async createWorkspace(command: any, ctx: IApplicationContext): Promise<Result<Record<string, unknown>>> {
    this._logger.info(`Workspace created: ${command.name}`, { plan: command.plan });
    return Result.ok({
      id: `ws_${Date.now()}`,
      name: command.name,
      plan: command.plan,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async updateWorkspace(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._logger.info(`Workspace updated: ${command.workspaceId}`);
    return Result.success();
  }
}
