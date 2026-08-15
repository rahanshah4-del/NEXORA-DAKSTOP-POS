/**
 * BarcodeScanner — Keyboard wedge barcode scanner integration.
 *
 * Detects barcode scanner input (rapid keystrokes + Enter suffix).
 * Supports: EAN13, UPC, QR, CODE128.
 *
 * Workflow: Scan → Find Product → Add to Cart → Success sound.
 */

export type BarcodeFormat = 'EAN13' | 'UPC' | 'QR' | 'CODE128' | 'UNKNOWN';

export interface ScanResult {
  barcode: string;
  format: BarcodeFormat;
  timestamp: string;
}

export type ScanCallback = (result: ScanResult) => void;

export class BarcodeScannerService {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: ScanCallback[] = [];
  private enabled = true;

  /** Detect barcode format from string. */
  detectFormat(barcode: string): BarcodeFormat {
    if (/^\d{13}$/.test(barcode)) return 'EAN13';
    if (/^\d{12}$/.test(barcode)) return 'UPC';
    if (/^[A-Za-z0-9+/=]{20,}$/.test(barcode)) return 'CODE128';
    if (barcode.startsWith('http') || barcode.length > 30) return 'QR';
    return 'UNKNOWN';
  }

  /** Feed a character into the scanner. Called from renderer keydown handler. */
  feedChar(char: string): ScanResult | null {
    if (!this.enabled) return null;

    if (char === 'Enter' || char === '\n') {
      const barcode = this.buffer;
      this.buffer = '';
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }

      if (barcode.length >= 6) {
        const result: ScanResult = {
          barcode,
          format: this.detectFormat(barcode),
          timestamp: new Date().toISOString(),
        };
        for (const cb of this.callbacks) {
          try { cb(result); } catch { /* swallow */ }
        }
        return result;
      }
      return null;
    }

    this.buffer += char;

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.buffer = ''; // Too slow — human typing
    }, 80);

    return null;
  }

  /** Subscribe to scan events. Returns unsubscribe function. */
  onScan(callback: ScanCallback): () => void {
    this.callbacks.push(callback);
    return () => { this.callbacks = this.callbacks.filter(c => c !== callback); };
  }

  /** Play success sound after scan. */
  playSuccessSound(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.1;
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch { /* Web Audio not available */ }
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  clear(): void { this.buffer = ''; }

  get isEnabled(): boolean { return this.enabled; }
}

export const barcodeScanner = new BarcodeScannerService();
