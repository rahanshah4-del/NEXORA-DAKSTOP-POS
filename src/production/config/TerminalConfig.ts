/**
 * TerminalConfig — Per-terminal configuration storage.
 */

export interface TerminalSettings {
  terminalId: string;
  terminalName: string;
  printerId: string;
  kitchenPrinterId: string;
  cashDrawerEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  receiptFooter: string;
  taxRateBps: number;
  taxName: string;
  tipsEnabled: boolean;
  autoPrintReceipt: boolean;
  autoPrintKitchen: boolean;
}

const STORAGE_KEY = 'nexora-terminal-config';

const DEFAULTS: TerminalSettings = {
  terminalId: 'terminal-1',
  terminalName: 'POS Terminal 1',
  printerId: 'default',
  kitchenPrinterId: 'default',
  cashDrawerEnabled: true,
  theme: 'system',
  language: 'en',
  currency: 'USD',
  receiptFooter: 'Thank you for dining with us!',
  taxRateBps: 850,
  taxName: 'VAT',
  tipsEnabled: true,
  autoPrintReceipt: true,
  autoPrintKitchen: true,
};

export class TerminalConfigService {
  private config: TerminalSettings;

  constructor() {
    this.config = this.load();
  }

  /** Get current terminal configuration. */
  get(): TerminalSettings { return { ...this.config }; }

  /** Update terminal configuration. */
  update(partial: Partial<TerminalSettings>): void {
    this.config = { ...this.config, ...partial };
    this.save();
  }

  /** Get a specific setting. */
  getSetting<K extends keyof TerminalSettings>(key: K): TerminalSettings[K] {
    return this.config[key];
  }

  /** Reset to defaults. */
  reset(): void {
    this.config = { ...DEFAULTS };
    this.save();
  }

  private load(): TerminalSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch { return { ...DEFAULTS }; }
  }

  private save(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config)); } catch { /* ok */ }
  }
}

export const terminalConfig = new TerminalConfigService();
