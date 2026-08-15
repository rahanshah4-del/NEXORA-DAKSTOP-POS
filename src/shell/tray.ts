/**
 * tray.ts — System tray icon and menu for the POS application.
 *
 * Provides:
 *   - Show/hide window
 *   - Quick status overview
 *   - Clock in/out shortcut
 *   - Quit application
 */

import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';

// ── State ──

let tray: Tray | null = null;
let mainWindowRef: BrowserWindow | null = null;

// ── Tray Icon Generator ──

/**
 * Generate a simple 16x16 tray icon programmatically.
 * In production, use a real icon file.
 */
function createTrayIcon(): nativeImage {
  // Create a simple coloured square as tray icon
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    // Blue-purple gradient-like fill
    canvas[offset] = 59;     // R
    canvas[offset + 1] = 130; // G
    canvas[offset + 2] = 246; // B
    canvas[offset + 3] = 255; // A
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

// ── Tray Menu Builder ──

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show Nexora Solution POS',
      click: () => {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      },
    },
    {
      label: 'Hide Window',
      click: () => {
        mainWindowRef?.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Clock In',
      enabled: false,
      click: () => {
        mainWindowRef?.webContents.send('navigate', '/employees');
      },
    },
    {
      label: 'Clock Out',
      enabled: false,
      click: () => {
        mainWindowRef?.webContents.send('navigate', '/employees');
      },
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        mainWindowRef?.webContents.send('navigate', '/');
      },
    },
    {
      label: 'New Order',
      click: () => {
        mainWindowRef?.webContents.send('navigate', '/billing');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Nexora Solution POS',
      click: () => {
        app.quit();
      },
    },
  ]);
}

// ── Public API ──

/**
 * Create and show the system tray icon.
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  mainWindowRef = mainWindow;

  if (tray && !tray.isDestroyed()) {
    return tray;
  }

  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Nexora Solution POS');
  tray.setContextMenu(buildTrayMenu());

  // Double-click shows the window
  tray.on('double-click', () => {
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (mainWindowRef.isMinimized()) mainWindowRef.restore();
      mainWindowRef.show();
      mainWindowRef.focus();
    }
  });

  return tray;
}

/**
 * Update the tray menu (e.g., after clock in/out).
 */
export function updateTrayMenu(menu: Menu): void {
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(menu);
  }
}

/**
 * Destroy the tray icon.
 */
export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
}

/**
 * Update tray tooltip with current status.
 */
export function setTrayStatus(status: string): void {
  if (tray && !tray.isDestroyed()) {
    tray.setToolTip(`Nexora Solution POS — ${status}`);
  }
}

export function getTray(): Tray | null {
  return tray;
}
