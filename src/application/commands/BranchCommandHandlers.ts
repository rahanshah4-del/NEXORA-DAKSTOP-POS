/**
 * BranchCommandHandlers.ts — Command handlers for Branch commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { ILogger } from '../common/IApplicationService';

export class BranchCommandHandlers {
  constructor(private _logger: ILogger) {}

  async createBranch(command: any, ctx: IApplicationContext): Promise<Result<Record<string, unknown>>> {
    this._logger.info(`Branch created: ${command.name}`, { workspaceId: command.workspaceId });
    return Result.ok({
      branchId: `br_${Date.now()}`,
      workspaceId: command.workspaceId ?? 'default',
      branchName: command.name,
      branchCode: command.code ?? '000',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  async updateBranch(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._logger.info(`Branch updated: ${command.branchId}`);
    return Result.success();
  }

  async switchBranch(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    this._logger.info(`Branch switched: ${command.branchId}`);
    return Result.success();
  }
}
