/**
 * ISettingsRepository — repository interface for App Settings.
 * Interface only. No implementation.
 */

import type { AppSetting } from '../types/models';
import type { IRepository } from './IRepository';

// ── Settings Repository Interface ──

export interface ISettingsRepository extends IRepository<AppSetting> {
  /** Get a setting value by key */
  get(key: string): Promise<string | null>;

  /** Get a setting value with a default fallback */
  getWithDefault(key: string, defaultValue: string): Promise<string>;

  /** Set a setting value */
  set(key: string, value: string): Promise<void>;

  /** Set multiple settings at once */
  setBatch(settings: Record<string, string>): Promise<void>;

  /** Delete a setting by key */
  delete(key: string): Promise<void>;

  /** Get all settings as a key-value map */
  getAllAsMap(): Promise<Record<string, string>>;

  /** Export all settings as JSON */
  exportToJson(): Promise<string>;

  /** Import settings from JSON */
  importFromJson(json: string): Promise<void>;

  /** Check if a setting key exists */
  hasKey(key: string): Promise<boolean>;
}
