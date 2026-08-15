/**
 * printing.ts — Native printing for receipts, kitchen tickets, and reports.
 *
 * Supports:
 *   - Receipt printing (POS thermal printer)
 *   - Kitchen ticket printing (KDS printer)
 *   - PDF export for reports
 *   - Silent printing (no dialog)
 *   - Print preview
 */

import { BrowserWindow, app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// ── Types ──

export type PrintTarget = 'receipt' | 'kitchen' | 'report';

export interface PrintOptions {
  /** Target printer type. */
  target: PrintTarget;

  /** Printer name (from system). If omitted, uses default. */
  printerName?: string;

  /** Number of copies. */
  copies?: number;

  /** If true, skips the print dialog. */
  silent?: boolean;

  /** If true, shows print preview instead of printing. */
  preview?: boolean;

  /** Page size for reports. */
  pageSize?: 'A4' | 'Letter' | '80mm' | '58mm';

  /** Custom header text for the printout. */
  headerText?: string;

  /** Custom footer text for the printout. */
  footerText?: string;
}

export interface PrintJob {
  id: string;
  target: PrintTarget;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  printerName: string;
  copies: number;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
}

// ── Job Tracking ──

const _jobHistory: PrintJob[] = [];
const MAX_JOB_HISTORY = 100;

function trackJob(target: PrintTarget, printerName: string, copies: number): PrintJob {
  const job: PrintJob = {
    id: `print_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    target,
    status: 'pending',
    printerName,
    copies,
    startedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };
  _jobHistory.push(job);
  if (_jobHistory.length > MAX_JOB_HISTORY) _jobHistory.shift();
  return job;
}

function completeJob(job: PrintJob, error: string | null): void {
  job.status = error ? 'failed' : 'completed';
  job.completedAt = new Date().toISOString();
  job.error = error;
}

// ── Receipt HTML Generator ──

export function generateReceiptHtml(data: {
  restaurantName: string;
  restaurantAddress?: string;
  orderNumber: number;
  tableName?: string;
  date: string;
  items: Array<{ name: string; qty: number; price: string }>;
  subtotal: string;
  tax: string;
  total: string;
  paymentMethod: string;
  footer?: string;
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td>${item.qty}x</td>
      <td style="width:100%">${item.name}</td>
      <td style="text-align:right">${item.price}</td>
    </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; padding: 8px; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h2 { font-size: 14px; margin-bottom: 2px; }
  .header p { font-size: 10px; color: #555; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 4px; font-size: 11px; }
  .total-row td { font-weight: bold; font-size: 13px; border-top: 1px solid #000; }
  .footer { text-align: center; font-size: 10px; margin-top: 8px; color: #555; }
</style></head><body>
  <div class="header">
    <h2>${data.restaurantName}</h2>
    ${data.restaurantAddress ? `<p>${data.restaurantAddress}</p>` : ''}
    <p>${data.date}</p>
  </div>
  <div class="divider"></div>
  <p>Order #${data.orderNumber} ${data.tableName ? `— ${data.tableName}` : ''}</p>
  <div class="divider"></div>
  <table>${itemsHtml}</table>
  <div class="divider"></div>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${data.subtotal}</td></tr>
    <tr><td>Tax</td><td style="text-align:right">${data.tax}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${data.total}</td></tr>
    <tr><td>Payment</td><td style="text-align:right">${data.paymentMethod}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="footer">${data.footer ?? 'Thank you for dining with us!'}</div>
</body></html>`;
}

// ── Kitchen Ticket HTML Generator ──

export function generateKitchenTicketHtml(data: {
  restaurantName: string;
  orderNumber: number;
  tableName: string;
  priority: string;
  date: string;
  items: Array<{ name: string; qty: number; notes?: string }>;
}): string {
  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td>${item.qty}x</td>
      <td style="width:100%">${item.name}</td>
      ${item.notes ? `<tr><td></td><td style="font-size:10px;color:#666">↳ ${item.notes}</td></tr>` : ''}
    </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 14px; width: 80mm; padding: 8px; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
  .header h2 { font-size: 16px; }
  .priority { font-size: 12px; font-weight: bold; }
  .priority.rush { color: #d97706; } .priority.high { color: #dc2626; }
  .order-info { margin: 8px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 4px; font-size: 13px; }
</style></head><body>
  <div class="header">
    <h2>${data.restaurantName}</h2>
    <h3>KITCHEN TICKET</h3>
    <p class="priority ${data.priority}">${data.priority.toUpperCase()}</p>
  </div>
  <div class="order-info">
    <p><strong>Order #${data.orderNumber}</strong> — ${data.tableName}</p>
    <p>${data.date}</p>
  </div>
  <table>${itemsHtml}</table>
</body></html>`;
}

// ── Print Execution ──

/**
 * Print a receipt or kitchen ticket.
 *
 * Creates a hidden BrowserWindow, loads the HTML, and calls webContents.print().
 */
export async function executePrint(
  html: string,
  options: PrintOptions,
  parentWindow?: BrowserWindow,
): Promise<PrintJob> {
  const printerName = options.printerName ?? 'default';
  const job = trackJob(options.target, printerName, options.copies ?? 1);

  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      width: 300,
      height: 400,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWin.webContents.on('did-finish-load', () => {
      const printOpts: Electron.WebContentsPrintOptions = {
        silent: options.silent ?? true,
        printBackground: false,
        deviceName: options.printerName,
        copies: options.copies ?? 1,
        margins: { marginType: 'none' },
        pageSize: options.pageSize === '80mm'
          ? { width: 80000, height: 200000 } // 80mm in microns
          : options.pageSize === '58mm'
            ? { width: 58000, height: 200000 }
            : 'A4',
      };

      printWin.webContents.print(printOpts, (success, failureReason) => {
        completeJob(job, success ? null : (failureReason ?? 'Print failed'));
        printWin.close();
        resolve(job);
      });
    });

    printWin.webContents.on('did-fail-load', (_event, _code, description) => {
      completeJob(job, description);
      printWin.close();
      resolve(job);
    });
  });
}

/**
 * Export HTML content as PDF.
 */
export async function exportToPdf(
  html: string,
  outputPath: string,
  parentWindow?: BrowserWindow,
): Promise<{ success: boolean; path: string; error?: string }> {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWin.webContents.on('did-finish-load', () => {
      printWin.webContents
        .printToPDF({ printBackground: true, landscape: false, pageSize: 'A4' })
        .then((data) => {
          const fs = require('fs');
          const dir = require('path').dirname(outputPath);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          fs.writeFileSync(outputPath, data);
          printWin.close();
          resolve({ success: true, path: outputPath });
        })
        .catch((err: Error) => {
          printWin.close();
          resolve({ success: false, path: outputPath, error: err.message });
        });
    });
  });
}

/**
 * Show print preview for a receipt/ticket/report.
 */
export function showPrintPreview(html: string, parentWindow?: BrowserWindow): BrowserWindow {
  const previewWin = new BrowserWindow({
    width: 420,
    height: 700,
    parent: parentWindow,
    modal: true,
    title: 'Print Preview',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  previewWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return previewWin;
}

/**
 * Get print job history.
 */
export function getPrintJobHistory(limit = 20): PrintJob[] {
  return _jobHistory.slice(-limit);
}
