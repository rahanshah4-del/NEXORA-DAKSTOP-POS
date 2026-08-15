/**
 * Printer Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

export type PrinterType = 'receipt' | 'kitchen' | 'bar' | 'label';
export type PaperSize = '58mm' | '80mm';

export interface Printer {
  id: string;
  name: string;
  printerType: PrinterType;
  ipAddress: string | null;
  port: number | null;
  paperSize: PaperSize;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrintJob {
  id: string;
  printerId: string;
  printerName: string;
  jobType: 'receipt' | 'kitchen_ticket' | 'report' | 'label';
  content: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  copyCount: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface IPrinterService {
  addPrinter(printer: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Printer>;
  updatePrinter(id: string, data: Partial<Printer>): Promise<Printer>;
  deletePrinter(id: string): Promise<void>;
  getPrinter(id: string): Promise<Printer | null>;
  getPrinters(type?: PrinterType): Promise<Printer[]>;
  printReceipt(orderId: string, printerId: string, copies: number): Promise<PrintJob>;
  printKitchenTicket(ticketId: string, printerId: string): Promise<PrintJob>;
  getPrintJobHistory(printerId?: string, startDate?: string, endDate?: string): Promise<PrintJob[]>;
  reprintJob(jobId: string): Promise<PrintJob>;
  cancelJob(jobId: string): Promise<void>;
}

export interface IPrinterValidator {
  validateAdd(printer: Omit<Printer, 'id' | 'createdAt' | 'updatedAt'>): import('../shared/IValidationResult').IValidationResult;
  validateIpAddress(ip: string | null): import('../shared/IValidationResult').IValidationResult;
  validatePort(port: number | null): import('../shared/IValidationResult').IValidationResult;
}

export interface IPrinterPolicy {
  maxPrintersPerType(): number;
  autoPrintOnOrderCreate(): boolean;
  autoPrintOnPayment(): boolean;
  receiptFooterText(): string;
  kitchenTicketCategories(): string[];
}
