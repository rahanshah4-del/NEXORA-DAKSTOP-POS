/**
 * SettingsCommandHandlers.ts — Command handlers for Settings commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { ISettingsRepository } from '../../repositories/ISettingsRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';

export class SettingsCommandHandlers {
  constructor(
    private _settingsRepo: ISettingsRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async updateSetting(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._settingsRepo.set(command.key, command.value);
    this._events.publish('setting.changed', { key: command.key });
    return Result.success();
  }

  async bulkUpdateSettings(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._settingsRepo.setBatch(command.settings ?? {});
    this._events.publish('setting.changed', { keys: Object.keys(command.settings ?? {}) });
    return Result.success();
  }

  async resetSetting(command: any, ctx: IApplicationContext): Promise<Result<void>> {
    await this._settingsRepo.delete(command.key);
    return Result.success();
  }
}
