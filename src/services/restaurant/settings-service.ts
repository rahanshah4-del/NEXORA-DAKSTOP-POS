/**
 * SettingsService — Restaurant application settings management.
 *
 * Orchestrates: SettingsRepository
 * Key-value store for POS configuration (tax rates, receipt settings, etc.).
 */

import type { ISettingsRepository } from '../../../repositories/ISettingsRepository';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors: [] };
}

// ── Well-Known Setting Keys ──

export const SETTING_KEYS = {
  // Restaurant
  RESTAURANT_NAME: 'restaurant.name',
  RESTAURANT_ADDRESS: 'restaurant.address',
  RESTAURANT_PHONE: 'restaurant.phone',

  // Tax
  TAX_RATE_BPS: 'tax.rateBps',
  TAX_NAME: 'tax.name',
  TAX_INCLUSIVE: 'tax.inclusive',
  TAX_EXEMPT_CATEGORIES: 'tax.exemptCategories',

  // Receipt
  RECEIPT_HEADER: 'receipt.header',
  RECEIPT_FOOTER: 'receipt.footer',
  RECEIPT_SHOW_TAX: 'receipt.showTax',
  RECEIPT_PRINT_ON_COMPLETE: 'receipt.printOnComplete',

  // Kitchen
  KITCHEN_AUTO_PRINT: 'kitchen.autoPrint',
  KITCHEN_TICKET_TIMEOUT_MINUTES: 'kitchen.ticketTimeoutMinutes',

  // Tips
  TIPS_ENABLED: 'tips.enabled',
  TIPS_DEFAULT_PERCENTAGES: 'tips.defaultPercentages',
  TIPS_AUTO_GRATUITY_ENABLED: 'tips.autoGratuityEnabled',

  // Discount
  DISCOUNT_MAX_PERCENT: 'discount.maxPercent',
  DISCOUNT_REQUIRE_MANAGER: 'discount.requireManager',

  // Tables
  TABLES_DEFAULT_SECTION: 'tables.defaultSection',
  TABLES_MAX_CAPACITY: 'tables.maxCapacity',

  // Loyalty
  LOYALTY_ENABLED: 'loyalty.enabled',
  LOYALTY_POINTS_PER_DOLLAR: 'loyalty.pointsPerDollar',

  // Currency
  CURRENCY_SYMBOL: 'currency.symbol',
  CURRENCY_LOCALE: 'currency.locale',
} as const;

// ── Service ──

export class SettingsService {
  constructor(private settingsRepo: ISettingsRepository) {}

  /**
   * Get a setting value by key.
   */
  async get(key: string): Promise<string | null> {
    return this.settingsRepo.get(key);
  }

  /**
   * Get a setting with a default fallback.
   */
  async getOrDefault(key: string, defaultValue: string): Promise<string> {
    return this.settingsRepo.getWithDefault(key, defaultValue);
  }

  /**
   * Get a numeric setting.
   */
  async getNumber(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.settingsRepo.get(key);
    return value !== null ? Number(value) : defaultValue;
  }

  /**
   * Get a boolean setting (stored as 'true'/'false').
   */
  async getBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.settingsRepo.get(key);
    if (value === null) return defaultValue;
    return value === 'true' || value === '1';
  }

  /**
   * Get a JSON-parsed setting.
   */
  async getJson<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.settingsRepo.get(key);
    if (value === null) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Set a setting value.
   */
  async set(key: string, value: string): Promise<ServiceResult<void>> {
    if (!key || key.trim().length === 0) {
      return fail('Setting key is required');
    }
    await this.settingsRepo.set(key, value);
    return ok(undefined);
  }

  /**
   * Set a numeric setting.
   */
  async setNumber(key: string, value: number): Promise<ServiceResult<void>> {
    return this.set(key, String(value));
  }

  /**
   * Set a boolean setting.
   */
  async setBoolean(key: string, value: boolean): Promise<ServiceResult<void>> {
    return this.set(key, value ? 'true' : 'false');
  }

  /**
   * Set a JSON setting.
   */
  async setJson(key: string, value: unknown): Promise<ServiceResult<void>> {
    return this.set(key, JSON.stringify(value));
  }

  /**
   * Set multiple settings at once.
   */
  async setBatch(settings: Record<string, string>): Promise<ServiceResult<void>> {
    if (Object.keys(settings).length === 0) {
      return fail('No settings provided');
    }
    await this.settingsRepo.setBatch(settings);
    return ok(undefined);
  }

  /**
   * Delete a setting.
   */
  async delete(key: string): Promise<ServiceResult<void>> {
    await this.settingsRepo.delete(key);
    return ok(undefined);
  }

  /**
   * Reset a setting to its default (deletes it).
   */
  async reset(key: string): Promise<ServiceResult<void>> {
    return this.delete(key);
  }

  /**
   * Get all settings as a flat map.
   */
  async getAll(): Promise<Record<string, string>> {
    return this.settingsRepo.getAllAsMap();
  }

  /**
   * Check if a setting key exists.
   */
  async hasKey(key: string): Promise<boolean> {
    return this.settingsRepo.hasKey(key);
  }

  /**
   * Export all settings as JSON.
   */
  async exportJson(): Promise<string> {
    return this.settingsRepo.exportToJson();
  }

  /**
   * Import settings from a JSON string.
   */
  async importJson(json: string): Promise<ServiceResult<void>> {
    try {
      await this.settingsRepo.importFromJson(json);
      return ok(undefined);
    } catch (err) {
      return fail(`Invalid settings JSON: ${(err as Error).message}`);
    }
  }

  // ── Convenience Accessors ──

  async getRestaurantName(): Promise<string> {
    return this.getOrDefault(SETTING_KEYS.RESTAURANT_NAME, 'My Restaurant');
  }

  async getTaxRateBps(): Promise<number> {
    return this.getNumber(SETTING_KEYS.TAX_RATE_BPS, 0);
  }

  async isTaxInclusive(): Promise<boolean> {
    return this.getBoolean(SETTING_KEYS.TAX_INCLUSIVE, false);
  }

  async getCurrencySymbol(): Promise<string> {
    return this.getOrDefault(SETTING_KEYS.CURRENCY_SYMBOL, '$');
  }

  async isTipsEnabled(): Promise<boolean> {
    return this.getBoolean(SETTING_KEYS.TIPS_ENABLED, true);
  }

  async getTipPercentages(): Promise<number[]> {
    return this.getJson<number[]>(SETTING_KEYS.TIPS_DEFAULT_PERCENTAGES, [1500, 1800, 2000]);
  }

  async isLoyaltyEnabled(): Promise<boolean> {
    return this.getBoolean(SETTING_KEYS.LOYALTY_ENABLED, false);
  }

  async isAutoPrintKitchenEnabled(): Promise<boolean> {
    return this.getBoolean(SETTING_KEYS.KITCHEN_AUTO_PRINT, true);
  }

  async getReceiptFooter(): Promise<string> {
    return this.getOrDefault(SETTING_KEYS.RECEIPT_FOOTER, 'Thank you for dining with us!');
  }
}
