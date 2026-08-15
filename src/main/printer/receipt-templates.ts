/**
 * receipt-templates.ts — Professional KOT and Bill receipt templates.
 *
 * Thermal printer constraints: 48 chars (80mm) / 32 chars (58mm),
 * fixed-width font, no colors/graphics — design relies on bold, double-size
 * text, alignment, and separator lines for visual hierarchy.
 */

import { EscposBuilder, type ReceiptSection } from './escpos-builder';
import type { OrderPayload, PrinterConfig } from './types';

export interface TemplateResult {
  builder: EscposBuilder;
  sections: ReceiptSection[];
}

// ── Helpers ──

function fmt(symbol: string, amount: number): string {
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', SAR: '﷼', JPY: '¥',
  CNY: '¥', PKR: 'Rs', BDT: '৳', LKR: 'රු', NPR: 'रू',
};

function symbolFor(currency?: string): string {
  return CURRENCY_SYMBOLS[currency || ''] || currency || '₹';
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function nowTime(): string {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ═══════════════════════════════════════════════════
//  KOT — Kitchen Order Ticket
// ═══════════════════════════════════════════════════

export function buildKOTReceipt(
  data: OrderPayload,
  paperWidth: number,
  config: PrinterConfig,
): TemplateResult {
  const info = data.restaurantInfo;
  const name = info?.name || 'Nexora Solution';
  const b = new EscposBuilder(paperWidth);
  const sc: ReceiptSection[] = [];

  b.init();

  // ── Header: restaurant name BIG ──
  b.alignCenter();
  b.doubleOn();
  b.boldLine(name);
  b.doubleOff();

  sc.push({ type: 'headline', text: name });

  // Subtitle
  b.centered(info?.address || '');
  if (info?.phone || info?.email) {
    b.centered([info?.phone, info?.email].filter(Boolean).join(' | '));
  }
  if (info?.gstNo) b.centered(`GST: ${info.gstNo}`);

  sc.push({ type: 'centered', text: info?.address || '' });
  if (info?.phone || info?.email) sc.push({ type: 'centered', text: [info?.phone, info?.email].filter(Boolean).join(' | ') });
  if (info?.gstNo) sc.push({ type: 'centered', text: `GST: ${info.gstNo}` });

  b.feed();

  // ── Doc type badge ──
  b.thickLine();
  b.boldCentered('KITCHEN ORDER TICKET');
  b.thickLine();

  sc.push({ type: 'thick-separator' });
  sc.push({ type: 'bold-centered', text: 'KITCHEN ORDER TICKET' });
  sc.push({ type: 'thick-separator' });
  sc.push({ type: 'blank' });

  // ── Order info ──
  b.boldOn().doubleWidthOn();
  b.row(`KOT #${data.orderNumber}`, data.orderType || '');
  b.doubleWidthOff().boldOff();
  b.dashedLine();

  sc.push({ type: 'bold-row', left: `KOT #${data.orderNumber}`, right: data.orderType || '' });
  sc.push({ type: 'separator' });

  if (data.table)  { b.row('Table:', data.table);       sc.push({ type: 'row', left: 'Table:', right: data.table }); }
  if (data.customer) { b.row('Customer:', data.customer); sc.push({ type: 'row', left: 'Customer:', right: data.customer }); }
  b.row('Date:', today());
  b.row('Time:', nowTime());
  sc.push({ type: 'row', left: 'Date:', right: today() });
  sc.push({ type: 'row', left: 'Time:', right: nowTime() });

  b.dashedLine();
  sc.push({ type: 'separator' });

  // ── Items ──
  b.boldOn();
  b.row('ITEM', 'QTY');
  b.boldOff();
  b.dashedLine();

  sc.push({ type: 'section-header', left: 'ITEM', right: 'QTY' });

  const items = data.cartRows || [];
  for (const item of items) {
    const name = (item.itemName || 'Unknown').slice(0, 28);
    const qty = String(item.qty || 1);

    // Item name — bold for kitchen scannability
    b.boldLine(`  ${name}`);

    // Quantity — double-width so staff see it instantly
    b.doubleWidthOn();
    b.line(`       x${qty}`);
    b.doubleWidthOff();

    // Notes — indented, bracketed, distinct
    if (item.note) {
      b.line(`         [${item.note}]`);
    }

    sc.push({ type: 'item', text: name, subtext: item.note || undefined });
    sc.push({ type: 'item-row', qty: qty, price: '', lineTotal: '' });
  }

  b.dashedLine();
  sc.push({ type: 'separator' });

  // Notes
  if (data.kotNotes || data.notes) {
    b.boldLine(`NOTE: ${data.kotNotes || data.notes}`);
    b.dashedLine();
    sc.push({ type: 'line', text: `NOTE: ${data.kotNotes || data.notes}` });
    sc.push({ type: 'separator' });
  }

  // ── Footer ──
  b.feed();
  b.centered(info?.billFooter || '');

  sc.push({ type: 'blank' });
  sc.push({ type: 'subtitle', text: info?.billFooter || '' });

  if (config.duplicateKOT) {
    b.feed();
    b.boldCentered('*** DUPLICATE — KITCHEN COPY ***');
    sc.push({ type: 'bold-centered', text: '*** DUPLICATE — KITCHEN COPY ***' });
  }

  b.cut();

  return { builder: b, sections: sc };
}

// ═══════════════════════════════════════════════════
//  BILL — Customer Receipt
// ═══════════════════════════════════════════════════

export function buildBillReceipt(
  data: OrderPayload,
  paperWidth: number,
  config: PrinterConfig,
): TemplateResult {
  const info = data.restaurantInfo;
  const name = info?.name || 'Nexora Solution';
  const sym = symbolFor(info?.currency);
  const b = new EscposBuilder(paperWidth);
  const sc: ReceiptSection[] = [];

  b.init();

  // ── Header: restaurant name BIG ──
  b.alignCenter();
  b.doubleOn();
  b.boldLine(name);
  b.doubleOff();

  sc.push({ type: 'headline', text: name });

  // Business info
  b.centered(info?.address || '');
  if (info?.phone || info?.email) {
    b.centered([info?.phone, info?.email].filter(Boolean).join(' | '));
  }
  if (config.printGST && info?.gstNo) {
    b.centered(`GST: ${info.gstNo}`);
  }

  sc.push({ type: 'centered', text: info?.address || '' });
  if (info?.phone || info?.email) sc.push({ type: 'centered', text: [info?.phone, info?.email].filter(Boolean).join(' | ') });
  if (config.printGST && info?.gstNo) sc.push({ type: 'centered', text: `GST: ${info.gstNo}` });

  b.feed();
  b.thickLine();

  sc.push({ type: 'blank' });
  sc.push({ type: 'thick-separator' });

  // ── Bill info ──
  b.boldOn().doubleWidthOn();
  b.row(`${info?.billPrefix || 'BILL-'}${data.orderNumber}`, data.orderType || '');
  b.doubleWidthOff().boldOff();
  b.dashedLine();

  sc.push({ type: 'bold-row', left: `${info?.billPrefix || 'BILL-'}${data.orderNumber}`, right: data.orderType || '' });
  sc.push({ type: 'separator' });

  if (data.table)    { b.row('Table:', data.table);       sc.push({ type: 'row', left: 'Table:', right: data.table }); }
  if (data.customer) { b.row('Customer:', data.customer); sc.push({ type: 'row', left: 'Customer:', right: data.customer }); }
  if (data.phone)    { b.row('Phone:', data.phone);       sc.push({ type: 'row', left: 'Phone:', right: data.phone }); }
  b.row('Date:', today());
  b.row('Time:', nowTime());
  sc.push({ type: 'row', left: 'Date:', right: today() });
  sc.push({ type: 'row', left: 'Time:', right: nowTime() });

  b.dashedLine();
  sc.push({ type: 'separator' });

  // ── Items ──
  b.boldOn();
  b.row('Item', 'Qty x Price    Amt');
  b.boldOff();
  b.dashedLine();

  sc.push({ type: 'section-header', left: 'Item', right: 'Qty x Price    Amt' });

  const items = data.cartRows || [];
  const totals = data.totals;
  for (const item of items) {
    const name = (item.itemName || 'Unknown').slice(0, 28);
    const qty = item.qty || 1;
    const price = item.itemPrice || 0;
    const lineTotal = qty * price;

    b.line(`  ${name}`);
    b.boldOn();
    b.row(`     ${qty} x ${fmt(sym, price)}`, fmt(sym, lineTotal));
    b.boldOff();

    sc.push({ type: 'item', text: name });
    sc.push({ type: 'item-row', qty: String(qty), price: fmt(sym, price), lineTotal: fmt(sym, lineTotal) });
  }

  b.dashedLine();
  sc.push({ type: 'separator' });

  // ── Totals ──
  const subtotal = totals?.subtotal ?? data.total ?? 0;
  b.row('Subtotal', fmt(sym, subtotal));
  sc.push({ type: 'row', left: 'Subtotal', right: fmt(sym, subtotal) });

  const discount = totals?.discount ?? 0;
  if (discount > 0) {
    b.row(`Discount (${data.discountPercent ?? 0}%)`, `-${fmt(sym, discount)}`);
    sc.push({ type: 'row', left: `Discount (${data.discountPercent ?? 0}%)`, right: `-${fmt(sym, discount)}` });
  }

  const tax = totals?.tax ?? 0;
  if (tax > 0 && config.printGST) {
    // Use the real cgst/sgst split passed by the renderer; fall back to a 50/50
    // split only for legacy payloads that don't carry the split.
    const cgst = (totals as any)?.cgst ?? Math.round(tax / 2);
    const sgst = (totals as any)?.sgst ?? (tax - cgst);
    b.row(`CGST ${info?.cgstRate || '0'}%`, fmt(sym, cgst));
    b.row(`SGST ${info?.sgstRate || '0'}%`, fmt(sym, sgst));
    sc.push({ type: 'row', left: `CGST ${info?.cgstRate || '0'}%`, right: fmt(sym, cgst) });
    sc.push({ type: 'row', left: `SGST ${info?.sgstRate || '0'}%`, right: fmt(sym, sgst) });
  }

  // ── TOTAL — the most prominent line on the receipt ──
  b.thickLine();
  b.boldOn().doubleOn();
  b.row('TOTAL', fmt(sym, data.total ?? 0));
  b.doubleOff().boldOff();
  b.thickLine();

  sc.push({ type: 'total-line', left: 'TOTAL', right: fmt(sym, data.total ?? 0) });

  // ── Payment breakdown ──
  if (data.walletAmountUsed && data.walletAmountUsed > 0) {
    const remaining = (data.total ?? 0) - data.walletAmountUsed;
    b.feed();
    b.boldCentered('— PAYMENT BREAKDOWN —');
    b.dashedLine();
    b.row('Wallet', fmt(sym, data.walletAmountUsed));
    if (remaining > 0) {
      b.row('Cash / Card', fmt(sym, remaining));
    }

    sc.push({ type: 'blank' });
    sc.push({ type: 'bold-centered', text: '— PAYMENT BREAKDOWN —' });
    sc.push({ type: 'separator' });
    sc.push({ type: 'row', left: 'Wallet', right: fmt(sym, data.walletAmountUsed) });
    if (remaining > 0) {
      sc.push({ type: 'row', left: 'Cash / Card', right: fmt(sym, remaining) });
    }
  }

  // Notes
  if (data.kotNotes || data.notes) {
    b.feed();
    b.dashedLine();
    b.line(`Note: ${data.kotNotes || data.notes}`);
    b.dashedLine();
    sc.push({ type: 'blank' });
    sc.push({ type: 'separator' });
    sc.push({ type: 'line', text: `Note: ${data.kotNotes || data.notes}` });
    sc.push({ type: 'separator' });
  }

  // ── Footer ──
  b.feed();
  b.centered(info?.billFooter || '');
  b.feed();
  b.centered('Thank you for dining with us!');

  sc.push({ type: 'blank' });
  sc.push({ type: 'subtitle', text: info?.billFooter || '' });
  sc.push({ type: 'blank' });
  sc.push({ type: 'centered', text: 'Thank you for dining with us!' });

  // ── Customer copy ──
  if (config.customerCopy) {
    b.feed(2);
    b.thickLine();
    b.boldCentered('CUSTOMER COPY');
    b.thickLine();
    b.feed();
    b.alignCenter();
    b.doubleOn();
    b.boldLine(name);
    b.doubleOff();
    b.centered(`Bill: ${info?.billPrefix || ''}${data.orderNumber}`);
    b.feed();
    b.boldOn().doubleOn();
    b.centered(fmt(sym, data.total ?? 0));
    b.doubleOff().boldOff();
    b.feed();
    b.centered('Thank you!');

    sc.push({ type: 'blank' });
    sc.push({ type: 'thick-separator' });
    sc.push({ type: 'bold-centered', text: 'CUSTOMER COPY' });
    sc.push({ type: 'thick-separator' });
    sc.push({ type: 'blank' });
    sc.push({ type: 'headline', text: name });
    sc.push({ type: 'centered', text: `Bill: ${info?.billPrefix || ''}${data.orderNumber}` });
    sc.push({ type: 'blank' });
    sc.push({ type: 'bold-centered', text: fmt(sym, data.total ?? 0) });
    sc.push({ type: 'blank' });
    sc.push({ type: 'centered', text: 'Thank you!' });
  }

  b.cut();

  return { builder: b, sections: sc };
}
