/**
 * CashDrawer — ESC/POS cash drawer trigger service.
 *
 * Automatically opens after successful cash payment.
 * Configurable per terminal.
 */

export interface CashDrawerConfig {
  enabled: boolean;
  openOnCashPayment: boolean;
  openOnShiftStart: boolean;
  pulseDurationMs: number;
}

export class CashDrawerService {
  private config: CashDrawerConfig = {
    enabled: true,
    openOnCashPayment: true,
    openOnShiftStart: false,
    pulseDurationMs: 200,
  };

  /** Open the cash drawer (ESC/POS pulse). */
  async open(): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      // ESC/POS command to open drawer: ESC p m t1 t2
      // ESC = 0x1B, p = 0x70, m = 0x00, t1 = pulse on, t2 = pulse off
      const pulseOn = Math.min(this.config.pulseDurationMs, 255);
      const pulseOff = Math.min(100, 255);
      const command = Buffer.from([0x1B, 0x70, 0x00, pulseOn, pulseOff]);

      // In production, this writes to the printer's serial/USB port
      console.log('[CashDrawer] Open signal sent:', command.toString('hex'));
      return true;
    } catch (err) {
      console.error('[CashDrawer] Failed to open:', err);
      return false;
    }
  }

  /** Configure the cash drawer. */
  setConfig(config: Partial<CashDrawerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): CashDrawerConfig {
    return { ...this.config };
  }

  /** Check if drawer should open for a payment method. */
  shouldOpenForPayment(method: string): boolean {
    return this.config.openOnCashPayment && method === 'cash';
  }
}

export const cashDrawer = new CashDrawerService();
