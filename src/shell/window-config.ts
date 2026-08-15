/**
 * window-config.ts — Production-ready BrowserWindow configuration.
 *
 * Centralises all window creation settings. Single source of truth
 * for security, sizing, and behaviour across dev and production.
 */

import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';

// ── Security Constants ──

export const SECURE_WEB_PREFERENCES: Electron.WebPreferences = {
  // Preload scripts (comma-separated in actual config)
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: false, // Must be false for better-sqlite3 native module in preload
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  spellcheck: false,
  enableWebSQL: false,
  devTools: !app.isPackaged,
};

// ── Window Dimensions ──

export interface WindowDimensions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export const DEFAULT_WINDOW: WindowDimensions = {
  width: 1366,
  height: 868,
  minWidth: 1024,
  minHeight: 640,
};

export const KIOSK_WINDOW: WindowDimensions = {
  width: 1920,
  height: 1080,
  minWidth: 1920,
  minHeight: 1080,
};

// ── Window State ──

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
  displayBounds?: { width: number; height: number };
}

// ── BrowserWindow Factory ──

export interface WindowConfigOptions {
  /** Path to the preload script. */
  preloadPath: string;

  /** Saved window state for restoration. */
  savedState?: WindowState;

  /** URL to load (dev mode). */
  devUrl?: string;

  /** HTML file to load (production). */
  productionHtml?: string;

  /** Enable kiosk fullscreen mode. */
  kioskMode?: boolean;

  /** Show splash screen while loading. */
  showSplash?: boolean;
}

/**
 * Create a configured BrowserWindow with secure defaults.
 */
export function createConfiguredWindow(options: WindowConfigOptions): BrowserWindow {
  const dims = options.kioskMode ? KIOSK_WINDOW : DEFAULT_WINDOW;
  const saved = options.savedState ?? {
    width: dims.width,
    height: dims.height,
    isMaximized: false,
    isFullScreen: options.kioskMode ?? false,
  };

  const win = new BrowserWindow({
    width: saved.width ?? dims.width,
    height: saved.height ?? dims.height,
    minWidth: dims.minWidth,
    minHeight: dims.minHeight,
    x: saved.x,
    y: saved.y,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: !(options.showSplash ?? true), // Hide if splash screen is showing
    fullscreen: options.kioskMode ?? saved.isFullScreen,
    webPreferences: {
      preload: options.preloadPath,
      ...SECURE_WEB_PREFERENCES,
    },
  });

  // Ensure window is visible on at least one screen
  validateWindowBounds(win);

  // Load content
  if (options.devUrl && !app.isPackaged) {
    win.loadURL(options.devUrl);
  } else if (options.productionHtml) {
    win.loadFile(options.productionHtml);
  } else {
    // Fallback: dev server or production file
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
    if (isDev) {
      win.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173');
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'));
    }
  }

  return win;
}

/**
 * Validate that the window bounds are visible on at least one display.
 * If not, center the window on the primary display.
 */
export function validateWindowBounds(win: BrowserWindow): void {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) return;

  const bounds = win.getBounds();
  let isVisible = false;

  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    if (
      bounds.x < dx + dw &&
      bounds.x + 100 > dx &&
      bounds.y < dy + dh &&
      bounds.y + 100 > dy
    ) {
      isVisible = true;
      break;
    }
  }

  if (!isVisible) {
    win.center();
  }
}

/**
 * Extract the current window state for persistence.
 */
export function captureWindowState(win: BrowserWindow): WindowState {
  if (win.isDestroyed()) {
    return { width: 1366, height: 868, isMaximized: false, isFullScreen: false };
  }

  const isMaximized = win.isMaximized();
  const isFullScreen = win.isFullScreen();
  const bounds = win.getBounds();

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
    isFullScreen,
  };
}
