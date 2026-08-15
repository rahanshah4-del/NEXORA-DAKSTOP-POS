/**
 * Settings Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { AppSetting } from '../../types/models';
import type { ISettingChangedEvent } from '../events/IDomainEvents';

export interface ISettingCreateCommand { key: string; value: string; }
export interface ISettingUpdateCommand { key: string; value: string; }

export interface ISettingsService {
  get(key: string): Promise<string | null>;
  getOrDefault(key: string, defaultValue: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  setBatch(settings: Record<string, string>): Promise<void>;
  delete(key: string): Promise<void>;
  getAll(): Promise<Record<string, string>>;
  hasKey(key: string): Promise<boolean>;
  exportJson(): Promise<string>;
  importJson(json: string): Promise<void>;
  reset(key: string): Promise<void>;
}

export interface ISettingsValidator {
  validateKey(key: string): import('../shared/IValidationResult').IValidationResult;
  validateValue(key: string, value: string): import('../shared/IValidationResult').IValidationResult;
  validateImport(json: string): import('../shared/IValidationResult').IValidationResult;
}

export interface ISettingsPolicy {
  isReadOnly(key: string): boolean;
  isEncrypted(key: string): boolean;
  requiresRestart(key: string): boolean;
  getAllowedKeys(): string[];
  getDefaultValue(key: string): string | null;
}

export interface ISettingsFactory {
  createSetting(key: string, value: string): AppSetting;
  createDefaults(): AppSetting[];
}

export interface ISettingsEventPublisher {
  settingChanged(event: Omit<ISettingChangedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
