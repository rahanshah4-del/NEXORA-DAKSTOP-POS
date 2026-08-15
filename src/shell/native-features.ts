/**
 * native-features.ts — Native OS integration features.
 *
 * Supports:
 *   - Auto-launch on system startup
 *   - Native OS notifications
 *   - Power save blocker (keep system awake during shifts)
 *   - Fullscreen kiosk mode
 *   - Barcode scanner keyboard wedge support
 */

import { app, powerSaveBlocker, BrowserWindow } from 'electron';

// ── Auto-Launch ──

let _autoLaunchEnabled = false;

/**
 * Enable or disable auto-launch on system startup.
 */
export function setAutoLaunch(enabled: boolean): void {
  if (enabled === _autoLaunchEnabled) return;

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true, // Start minimised to tray
    path: app.getPath('exe'),
  });

  _autoLaunchEnabled = enabled;
}

export function isAutoLaunchEnabled(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}

// ── Power Save Blocker ──

let _powerSaveBlockerId: number | null = null;

/**
 * Prevent the system from sleeping (e.g., during an active shift).
 */
export function startPowerSaveBlocker(): void {
  if (_powerSaveBlockerId !== null) return;
  _powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
}

/**
 * Allow the system to sleep again.
 */
export function stopPowerSaveBlocker(): void {
  if (_powerSaveBlockerId !== null) {
    powerSaveBlocker.stop(_powerSaveBlockerId);
    _powerSaveBlockerId = null;
  }
}

export function isPowerSaveBlocked(): boolean {
  return _powerSaveBlockerId !== null && powerSaveBlocker.isStarted(_powerSaveBlockerId);
}

// ── Notifications ──

/**
 * Show a native OS notification.
 */
export function showNativeNotification(
  title: string,
  body: string,
  urgency: 'normal' | 'critical' = 'normal',
): void {
  // Use Electron's built-in Notification (works on all platforms)
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      urgency: urgency as 'normal' | 'critical',
      silent: urgency !== 'critical',
    });

    notification.on('click', () => {
      // Focus the main window
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        const win = wins[0];
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });

    notification.show();
  }
}

/**
 * Check if native notifications are supported.
 */
export function areNotificationsSupported(): boolean {
  return Notification.isSupported();
}

// ── Kiosk Mode ──

let _kioskMode = false;

/**
 * Toggle fullscreen kiosk mode.
 * In kiosk mode: fullscreen, no frame, Escape key disabled.
 */
export function toggleKioskMode(mainWindow: BrowserWindow): boolean {
  _kioskMode = !_kioskMode;
  mainWindow.setFullScreen(_kioskMode);
  mainWindow.setKiosk(_kioskMode);

  if (_kioskMode) {
    mainWindow.setMenuBarVisibility(false);
    startPowerSaveBlocker();
  } else {
    mainWindow.setMenuBarVisibility(true);
    stopPowerSaveBlocker();
  }

  return _kioskMode;
}

export function isKioskMode(): boolean {
  return _kioskMode;
}

/**
 * Enable kiosk mode with Escape key handler to exit.
 */
export function enableKioskMode(mainWindow: BrowserWindow): void {
  _kioskMode = true;
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  startPowerSaveBlocker();
}

/**
 * Exit kiosk mode.
 */
export function disableKioskMode(mainWindow: BrowserWindow): void {
  _kioskMode = false;
  mainWindow.setKiosk(false);
  mainWindow.setFullScreen(false);
  stopPowerSaveBlocker();
}

// ── Barcode Scanner Support ──

type BarcodeCallback = (barcode: string) => void;

let _barcodeCallbacks: BarcodeCallback[] = [];
let _barcodeBuffer = '';
let _barcodeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Register a callback for barcode scanner input.
 * Barcode scanners act as keyboard wedges — they type characters very fast
 * followed by an Enter key. We detect this pattern.
 */
export function onBarcodeScanned(callback: BarcodeCallback): () => void {
  _barcodeCallbacks.push(callback);
  return () => {
    _barcodeCallbacks = _barcodeCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Process a keyboard input character for barcode detection.
 * Should be called from the renderer's global keydown handler.
 *
 * @param char The character typed.
 * @returns true if a barcode was detected and processed.
 */
export function processBarcodeInput(char: string): boolean {
  // Barcode scanners typically send characters very fast (< 50ms between chars)
  // and terminate with Enter

  if (char === 'Enter' || char === '\n' || char === '\r') {
    if (_barcodeBuffer.length >= 6) {
      const barcode = _barcodeBuffer;
      _barcodeBuffer = '';

      for (const cb of _barcodeCallbacks) {
        try {
          cb(barcode);
        } catch { /* swallow */ }
      }
      return true;
    }
    _barcodeBuffer = '';
    return false;
  }

  // Reset buffer if too slow (not a barcode scanner)
  if (_barcodeTimer) clearTimeout(_barcodeTimer);

  _barcodeBuffer += char;

  _barcodeTimer = setTimeout(() => {
    _barcodeBuffer = ''; // Too slow — not a scanner
  }, 100);

  return false;
}

/**
 * Clear the barcode buffer.
 */
export function clearBarcodeBuffer(): void {
  _barcodeBuffer = '';
  if (_barcodeTimer) {
    clearTimeout(_barcodeTimer);
    _barcodeTimer = null;
  }
}
