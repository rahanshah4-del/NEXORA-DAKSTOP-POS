/**
 * ThermalPrinterService — Abstraction for 58mm/80mm thermal receipt printers.
 *
 * Supports: USB, LAN (IP), Bluetooth, Windows printer.
 * Print types: Customer Receipt, Kitchen Ticket, Invoice, Duplicate, Refund, Daily Summary.
 *
 * Architecture: Swappable provider — implement IPrinterProvider for different hardware.
 */

// ── Types ──

export type PrinterConnection = 'usb' | 'lan' | 'bluetooth' | 'windows';
export type PrintPaperSize = '58mm' | '80mm';
export type PrintJobType = 'receipt' | 'kitchen' | 'invoice' | 'duplicate' | 'refund' | 'daily-summary';

export interface PrinterConfig {
  id: string;
  name: string;
  connection: PrinterConnection;
  ipAddress?: string;
  port?: number;
  paperSize: PrintPaperSize;
  isDefault: boolean;
  isKitchenPrinter: boolean;
  isActive: boolean;
}

export interface PrintJobRequest {
  type: PrintJobType;
  printerId: string;
  html: string;
  copies: number;
  silent: boolean;
}

export interface PrintJobResult {
  success: boolean;
  jobId: string;
  error?: string;
}

// ── Provider Interface ──

export interface IPrinterProvider {
  readonly name: string;
  readonly connection: PrinterConnection;
  connect(config: PrinterConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  print(html: string, copies: number): Promise<PrintJobResult>;
  isConnected(): boolean;
  getStatus(): 'online' | 'offline' | 'error' | 'paper-out';
}

// ── Service ──

export class ThermalPrinterService {
  private printers = new Map<string, PrinterConfig>();
  private providers = new Map<string, IPrinterProvider>();
  private jobHistory: PrintJobResult[] = [];

  /** Register a printer configuration. */
  registerPrinter(config: PrinterConfig): void {
    this.printers.set(config.id, config);
  }

  /** Remove a printer configuration. */
  removePrinter(printerId: string): void {
    this.printers.delete(printerId);
  }

  /** Get all registered printers. */
  getPrinters(): PrinterConfig[] {
    return Array.from(this.printers.values());
  }

  /** Register a printer provider implementation. */
  registerProvider(provider: IPrinterProvider): void {
    this.providers.set(provider.connection, provider);
  }

  /** Print a job. */
  async print(request: PrintJobRequest): Promise<PrintJobResult> {
    const config = this.printers.get(request.printerId);
    if (!config) return { success: false, jobId: '', error: `Printer not found: ${request.printerId}` };

    const provider = this.providers.get(config.connection);
    if (!provider) return { success: false, jobId: '', error: `No provider for connection: ${config.connection}` };

    if (!provider.isConnected()) {
      const connected = await provider.connect(config);
      if (!connected) return { success: false, jobId: '', error: 'Failed to connect to printer' };
    }

    const result = await provider.print(request.html, request.copies);
    this.jobHistory.push(result);
    return result;
  }

  /** Get print job history. */
  getJobHistory(limit = 20): PrintJobResult[] {
    return this.jobHistory.slice(-limit);
  }

  /** Disconnect all printers. */
  async disconnectAll(): Promise<void> {
    for (const [, provider] of this.providers) {
      await provider.disconnect();
    }
  }
}

// ── Singleton ──

export const printerService = new ThermalPrinterService();
