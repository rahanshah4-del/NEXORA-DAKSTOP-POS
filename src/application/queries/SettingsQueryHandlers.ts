/**
 * SettingsQueryHandlers.ts — Query handlers for Settings queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { ISettingsRepository } from '../../repositories/ISettingsRepository';
import type { ILogger } from '../common/IApplicationService';
import type { AppSetting } from '../../types/models';

export class SettingsQueryHandlers {
  constructor(
    private _settingsRepo: ISettingsRepository,
    private _logger: ILogger,
  ) {}

  async getSettings(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<AppSetting>>> {
    let settings: AppSetting[];
    if (query.keys && Array.isArray(query.keys)) {
      settings = [];
      for (const key of query.keys) {
        const value = await this._settingsRepo.get(key);
        if (value !== null) {
          settings.push({ key, value, updatedAt: '' });
        }
      }
    } else {
      settings = await this._settingsRepo.findAll();
    }
    return Result.ok(this._toPage(settings, query));
  }

  async getSetting(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<AppSetting>>> {
    const value = await this._settingsRepo.get(query.key);
    const item = value !== null ? { key: query.key, value, updatedAt: '' } : null;
    return Result.ok(this._single(item, query));
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return { items: sliced, totalCount, offset, limit, hasNextPage: offset + limit < totalCount, hasPreviousPage: offset > 0, totalPages: Math.ceil(totalCount / limit), executionTimeMs: 0 };
  }

  private _single<T>(item: T | null, query: any): PaginatedResult<T> {
    const items = item ? [item] : [];
    return { items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 };
  }
}
