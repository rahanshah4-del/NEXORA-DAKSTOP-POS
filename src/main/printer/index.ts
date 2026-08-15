/**
 * printer/index.ts — Public API for thermal printing.
 *
 * Called from IPC handlers. Composes:
 *   1. Template selection (KOT vs Bill)
 *   2. ESC/POS byte generation
 *   3. Transport (file in test mode, TCP in production)
 */

import type { PrintResult, OrderPayload, PrinterConfig } from './types';
import { sendViaTransport, writeReceiptText } from './transport';
import { EscposBuilder } from './escpos-builder';
import { buildKOTReceipt, buildBillReceipt } from './receipt-templates';

/** Build a PrinterConfig from the settings store snapshot */
export function printerConfigFromStore(settings: Record<string, unknown>): PrinterConfig {
  const connectionRaw = (settings.printerConnection as string) || 'test';
  const connection = (connectionRaw === 'network' || connectionRaw === 'usb' || connectionRaw === 'test')
    ? connectionRaw
    : 'test';

  return {
    printerType: (settings.printerType as string) === 'thermal58' ? 'thermal58' : 'thermal80',
    printerName: (settings.printerName as string) || 'Thermal Printer',
    printerIp: (settings.printerIp as string) || '',
    printerConnection: connection,
    useRealPrinter: !!settings.useRealPrinter,
    autoPrintKOT: !!settings.autoPrintKOT,
    duplicateKOT: !!settings.duplicateKOT,
    customerCopy: !!settings.customerCopy,
    printGST: !!settings.printGST,
    printLogo: !!settings.printLogo,
    kotFormat: (settings.kotFormat as string) || 'format1',
  };
}

/** Determine paper width from printer type: 58mm or 80mm */
function paperWidth(config: PrinterConfig): number {
  return config.printerType === 'thermal58' ? 58 : 80;
}

/** Print a KOT (Kitchen Order Ticket) */
export async function printKOT(
  orderData: OrderPayload,
  config: PrinterConfig,
): Promise<PrintResult> {
  const w = paperWidth(config);
  const { builder, sections } = buildKOTReceipt(orderData, w, config);
  const bytes = builder.build();

  // Write human-readable text file for verification
  const label = `KOT-${orderData.orderNumber}`;
  const textContent = EscposBuilder.buildTextReceipt(w, sections);
  writeReceiptText(label, textContent);

  // Send raw bytes (routed: test-mode file write by default, or real network/USB)
  const result = await sendViaTransport(bytes, label, config);
  return {
    ...result,
    // Ensure txtPath is set (send() tries to find it but writeReceiptText already wrote it)
    txtPath: result.txtPath,
  };
}

/** Print a Bill (customer receipt with prices) */
export async function printBill(
  orderData: OrderPayload,
  config: PrinterConfig,
): Promise<PrintResult> {
  const w = paperWidth(config);
  const { builder, sections } = buildBillReceipt(orderData, w, config);
  const bytes = builder.build();

  const label = `BILL-${orderData.orderNumber}`;
  const textContent = EscposBuilder.buildTextReceipt(w, sections);
  writeReceiptText(label, textContent);

  const result = await sendViaTransport(bytes, label, config);
  return {
    ...result,
    txtPath: result.txtPath,
  };
}
