/**
 * types.ts — Printer module type definitions.
 */

export interface PrinterConfig {
  printerType: 'thermal80' | 'thermal58';
  printerName: string;
  printerIp: string;        // TCP host:port for network printers
  printerConnection: 'usb' | 'network' | 'test';  // transport selection
  useRealPrinter: boolean;  // false = test-mode file write (default); true = real hardware
  autoPrintKOT: boolean;
  duplicateKOT: boolean;
  customerCopy: boolean;
  printGST: boolean;
  printLogo: boolean;
  kotFormat: string;
}

export interface PrintJob {
  /** Which template to use */
  template: 'kot' | 'bill';
  /** Order data — the full object from Billing.tsx completePayment */
  orderData: Record<string, unknown>;
  /** 80mm or 58mm */
  paperWidth: number;
  /** Human-readable label for the output file */
  label: string;
}

export interface PrintResult {
  success: boolean;
  /** Path to the .bin file with raw ESC/POS bytes */
  binPath?: string;
  /** Path to the human-readable .txt file */
  txtPath?: string;
  error?: string;
}

/** Order data shape as passed from renderer (subset of PosOrder) */
export interface OrderPayload {
  orderNumber: string;
  orderType: string;
  table?: string;
  customer?: string;
  phone?: string;
  cartRows?: Array<{
    itemId: string;
    itemName: string;
    itemPrice: number;
    qty: number;
    note: string;
  }>;
  totals?: {
    subtotal: number;
    discount: number;
    netSubtotal: number;
    tax: number;
    total: number;
  };
  total: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  walletAmountUsed?: number;
  discountPercent?: number;
  notes?: string;
  kotNotes?: string;
  // Restaurant info passed from settings
  restaurantInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    gstNo: string;
    currency: string;
    /** Owner's ASCII symbol override from the workspace doc; "" = use the ISO code. */
    currencySymbol?: string;
    billPrefix: string;
    billFooter: string;
    cgstRate: string;
    sgstRate: string;
  };
}
