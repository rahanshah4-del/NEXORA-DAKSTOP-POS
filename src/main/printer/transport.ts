/**
 * transport.ts — Printer transport layer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  CONNECTING A REAL PRINTER (when hardware arrives)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Network (Ethernet/WiFi) thermal printer:
 *    1. Give the printer a static IP (e.g. 192.168.1.100) and note its port
 *       (almost always 9100 for ESC/POS raw TCP).
 *    2. Settings → Printer → Connection = "Network (Ethernet/WiFi)".
 *    3. Set "IP Address / Port" = 192.168.1.100:9100.
 *    4. Enable the "Use real printer" toggle (off by default).
 *    5. Click Test Print / print a KOT — the .bin file should NOT be created,
 *       and the printer should spit out the receipt.
 *
 *  USB thermal printer:
 *    Most USB thermal printers install as a system printer (RAW driver) or
 *    expose a serial/device port. USB is NOT yet fully implemented — it needs
 *    the `printer` (or `electron-printer`) native module + the printer visible
 *    to the OS. See `sendUsb()` for the exact missing piece.
 *
 *  Until "Use real printer" is ON, ALL printing stays in test mode: raw ESC/POS
 *  bytes are written to {userData}/print-jobs/*.bin plus a human-readable
 *  *.txt, so output can be verified without any hardware.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { Socket } from 'net';
import type { PrintResult } from './types';

const PRINT_JOBS_DIR = join(app.getPath('userData'), 'print-jobs');

const NETWORK_TIMEOUT_MS = 5000;

function ensureDir(): void {
  if (!existsSync(PRINT_JOBS_DIR)) mkdirSync(PRINT_JOBS_DIR, { recursive: true });
}

function sanitizeFilename(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Write a human-readable receipt to a .txt file.
 * The content argument is a plain-text string, not raw ESC/POS bytes.
 */
export function writeReceiptText(label: string, textContent: string): string {
  ensureDir();
  const ts = timestamp();
  const safeLabel = sanitizeFilename(label);
  const filename = `${ts}-${safeLabel}.txt`;
  const filePath = join(PRINT_JOBS_DIR, filename);
  writeFileSync(filePath, textContent, 'utf-8');
  return filePath;
}

/**
 * Test-mode send: writes raw ESC/POS bytes to a .bin file (plus finds/returns
 * the accompanying .txt). This is the default and the fallback.
 */
export async function send(
  bytes: Buffer,
  jobLabel: string,
): Promise<PrintResult> {
  ensureDir();
  const ts = timestamp();
  const safeLabel = sanitizeFilename(jobLabel);
  const binFilename = `${ts}-${safeLabel}.bin`;
  const binPath = join(PRINT_JOBS_DIR, binFilename);

  try {
    writeFileSync(binPath, bytes);

    const txtFilename = `${ts}-${safeLabel}.txt`;
    const txtPath = join(PRINT_JOBS_DIR, txtFilename);

    return {
      success: true,
      binPath,
      txtPath: existsSync(txtPath) ? txtPath : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Failed to write print job' };
  }
}

// ── Transport selection ──

/** Subset of PrinterConfig needed to route a print job. */
export interface TransportConfig {
  printerConnection: 'usb' | 'network' | 'test';
  useRealPrinter: boolean;
  printerIp: string;
  printerName: string;
}

/** Parse "host" or "host:port" into { host, port }. Defaults to 9100. */
function parseHostPort(ip: string): { host: string; port: number } {
  const trimmed = (ip || '').trim();
  if (!trimmed) return { host: '', port: 9100 };
  // IPv4 with an explicit port (IPv6 not expected for thermal printers).
  const idx = trimmed.lastIndexOf(':');
  if (idx > 0) {
    const host = trimmed.slice(0, idx);
    const port = parseInt(trimmed.slice(idx + 1), 10);
    if (host && !Number.isNaN(port)) return { host, port };
  }
  return { host: trimmed, port: 9100 };
}

/**
 * Network transport — raw TCP socket to printerIp:port.
 * Opens a socket, writes the ESC/POS buffer, waits a beat for the bytes to
 * flush, then closes. Times out after NETWORK_TIMEOUT_MS with a clear error.
 */
function sendNetwork(bytes: Buffer, host: string, port: number): Promise<PrintResult> {
  return new Promise((resolve) => {
    if (!host) {
      resolve({ success: false, error: 'No printer IP address configured.' });
      return;
    }

    const socket = new Socket();
    let settled = false;
    const finish = (result: PrintResult) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch { /* ignore */ }
      resolve(result);
    };

    socket.setTimeout(NETWORK_TIMEOUT_MS);

    socket.on('connect', () => {
      socket.write(bytes, () => {
        // Give the kernel/OS a moment to flush the bytes to the printer
        // before tearing down the socket (avoids truncated receipts).
        setTimeout(() => finish({ success: true }), 150);
      });
    });

    socket.on('error', (err: any) => {
      const code = err?.code ? ` (${err.code})` : '';
      finish({
        success: false,
        error: `Could not connect to printer at ${host}:${port} — check the printer is on and connected to the network${code}.`,
      });
    });

    socket.on('timeout', () => {
      finish({
        success: false,
        error: `Could not connect to printer at ${host}:${port} — connection timed out after ${NETWORK_TIMEOUT_MS / 1000}s. Check the printer is on and connected to the network.`,
      });
    });

    socket.connect({ host, port, timeout: NETWORK_TIMEOUT_MS });
  });
}

/**
 * USB transport — UNTESTED (no physical hardware available).
 *
 * Most USB thermal printers install as a *system* printer (RAW driver) and are
 * addressed via the OS spooler, not raw USB HID. node-thermal-printer's
 * `printer:` interface requires a native driver (`printer` or `electron-printer`
 * npm package) which is NOT yet in package.json (and needs native compilation).
 *
 * This is a deliberate, conservative stub: it does NOT attempt raw USB HID
 * (which would require the `usb`/`node-hid` native package and can't be tested
 * here). Instead it returns a clear, actionable error; the caller then falls
 * back to the test-mode file write so no order data is lost.
 *
 * To complete USB support once hardware is available:
 *   1. `npm install printer`  (or `electron-printer`)
 *   2. Install the USB printer as a system "RAW" printer.
 *   3. Replace the body below with `driver.printDirect({ data: bytes,
 *      printer: printerName || 'auto', type: 'RAW', ... })`.
 */
async function sendUsb(bytes: Buffer, printerName: string): Promise<PrintResult> {
  void bytes;
  void printerName;
  return {
    success: false,
    error: 'USB printing is not yet configured — install the printer as a system "RAW" printer and add the "printer" native module. See transport.ts header for setup steps. (Untested)',
  };
}

/**
 * Route a print job to test-mode, network, or USB based on config.
 *
 * Default is test mode. Real hardware is only attempted when
 * `config.useRealPrinter === true`.
 *
 * On real-mode failure we write a test-mode backup file (so the order data is
 * never lost) and still return `success: false` with the clear error — the
 * cashier sees the failure, and the owner can find the .bin/.txt backup to
 * diagnose the printer.
 */
export async function sendViaTransport(
  bytes: Buffer,
  jobLabel: string,
  config: TransportConfig,
): Promise<PrintResult> {
  const connection = config.printerConnection || 'test';
  const useReal = config.useRealPrinter === true;

  // Test mode (default), or no real printer requested → file write.
  if (!useReal || connection === 'test') {
    return send(bytes, jobLabel);
  }

  let result: PrintResult;

  if (connection === 'network') {
    const { host, port } = parseHostPort(config.printerIp);
    result = await sendNetwork(bytes, host, port);
  } else if (connection === 'usb') {
    result = await sendUsb(bytes, config.printerName);
  } else {
    result = await send(bytes, jobLabel);
  }

  // Fallback on failure: keep a test-mode backup + surface the clear error.
  if (!result.success) {
    const backup = await send(bytes, jobLabel);
    return { ...result, binPath: backup.binPath, txtPath: backup.txtPath };
  }

  return result;
}
