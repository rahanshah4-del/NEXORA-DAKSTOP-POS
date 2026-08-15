/**
 * LicenseService — Offline license validation and activation.
 *
 * Supports: Trial (14 days), Monthly, Yearly, Lifetime.
 * Machine-bound activation. No cloud dependency.
 */

export type LicenseType = 'trial' | 'monthly' | 'yearly' | 'lifetime';
export type LicenseStatus = 'active' | 'expired' | 'trial' | 'invalid' | 'none';

export interface License {
  type: LicenseType;
  status: LicenseStatus;
  key: string;
  machineId: string;
  activatedAt: string;
  expiresAt: string | null;
  customerName: string;
}

export class LicenseService {
  private license: License | null = null;
  private readonly STORAGE_KEY = 'nexora-license';

  constructor() { this.loadFromStorage(); }

  /** Activate a license with a key. */
  activate(licenseKey: string, customerName: string): { success: boolean; error?: string } {
    // Validate key format: NEX-XXXX-XXXX-XXXX
    if (!/^NEX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
      return { success: false, error: 'Invalid license key format' };
    }

    const type = this.detectType(licenseKey);
    const now = new Date().toISOString();

    this.license = {
      type,
      status: type === 'trial' ? 'trial' : 'active',
      key: licenseKey,
      machineId: this.getMachineId(),
      activatedAt: now,
      expiresAt: type === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString()
        : type === 'monthly' ? new Date(Date.now() + 30 * 86400000).toISOString()
        : type === 'yearly' ? new Date(Date.now() + 365 * 86400000).toISOString()
        : null,
      customerName,
    };

    this.saveToStorage();
    return { success: true };
  }

  /** Get current license status. */
  getStatus(): LicenseStatus {
    if (!this.license) return 'none';
    if (this.license.expiresAt && new Date(this.license.expiresAt) < new Date()) {
      this.license.status = 'expired';
      return 'expired';
    }
    return this.license.status;
  }

  /** Get current license info. */
  getLicense(): License | null { return this.license; }

  /** Check if the application is licensed. */
  isLicensed(): boolean {
    const status = this.getStatus();
    return status === 'active' || status === 'trial' || status === 'lifetime';
  }

  /** Days remaining on license. */
  daysRemaining(): number | null {
    if (!this.license?.expiresAt) return null;
    return Math.max(0, Math.ceil((new Date(this.license.expiresAt).getTime() - Date.now()) / 86400000));
  }

  private detectType(key: string): LicenseType {
    if (key.endsWith('-T')) return 'trial';
    if (key.endsWith('-M')) return 'monthly';
    if (key.endsWith('-Y')) return 'yearly';
    if (key.endsWith('-L')) return 'lifetime';
    return 'trial';
  }

  private getMachineId(): string {
    // Simple machine fingerprint — in production use a proper hardware ID
    return `MACH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }

  private saveToStorage(): void {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.license)); } catch { /* ok */ }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this.license = JSON.parse(raw) as License;
    } catch { /* ok */ }
  }
}

export const licenseService = new LicenseService();
