import { BrowserWindow, screen, app } from 'electron';
import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  displayBounds?: { width: number; height: number };
}

const DEFAULT_STATE: WindowState = {
  width: 1366,
  height: 868,
  isMaximized: false,
};

function getStatePath(): string {
  const userDataPath = app.getPath('userData');
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true });
  }
  return join(userDataPath, 'window-state.json');
}

function loadWindowState(): WindowState {
  try {
    const path = getStatePath();
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const state: WindowState = JSON.parse(raw);
      if (state && typeof state.width === 'number' && typeof state.height === 'number') {
        return validateState(state);
      }
    }
  } catch {
    // Corrupted state file — reset to defaults
  }
  return { ...DEFAULT_STATE };
}

function validateState(state: WindowState): WindowState {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) return state;

  let isVisible = false;
  for (const display of displays) {
    const { x: dx, y: dy, width: dw, height: dh } = display.bounds;
    if (
      state.x !== undefined &&
      state.y !== undefined &&
      state.x < dx + dw &&
      state.x + 100 > dx &&
      state.y < dy + dh &&
      state.y + 100 > dy
    ) {
      isVisible = true;
      break;
    }
  }

  if (!isVisible) {
    return { ...state, x: undefined, y: undefined };
  }
  return state;
}

export function persistWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  const isMaximized = win.isMaximized();
  const bounds = win.getBounds();
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
  };

  try {
    const path = getStatePath();
    writeFileSync(path, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // Silently fail — non-critical
  }
}

export function createMainWindow(): BrowserWindow {
  const savedState = loadWindowState();
  const preloadPath = join(__dirname, '../preload/index.js');

  const win = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    minWidth: 1024,
    minHeight: 640,
    x: savedState.x,
    y: savedState.y,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  win.on('ready-to-show', () => {
    if (savedState.isMaximized) {
      win.maximize();
    }
    win.show();
  });

  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const debouncedSave = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => persistWindowState(win), 500);
  };

  win.on('resize', debouncedSave);
  win.on('move', debouncedSave);

  win.on('maximize', () => {
    persistWindowState(win);
    win.webContents.send('window:maximizeChange', true);
  });
  win.on('unmaximize', () => {
    persistWindowState(win);
    win.webContents.send('window:maximizeChange', false);
  });
  win.on('enter-full-screen', () => {
    win.webContents.send('window:maximizeChange', true);
  });
  win.on('leave-full-screen', () => {
    win.webContents.send('window:maximizeChange', win.isMaximized());
  });

  const isDev = process.env.NODE_ENV === 'development' || !!process.env.ELECTRON_RENDERER_URL;

  if (isDev) {
    const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';

    // ── Retry-with-backoff: dev server may not be ready yet ──
    let retries = 0;
    const MAX_RETRIES = 30;
    const RETRY_MS = 500;

    const tryLoad = () => {
      win.loadURL(devUrl).catch(() => {
        retries++;
        if (retries <= MAX_RETRIES) {
          setTimeout(tryLoad, RETRY_MS);
        } else {
          console.error(`[STARTUP] Failed to load ${devUrl} after ${MAX_RETRIES} retries — dev server may be down`);
        }
      });
    };

    // Also handle render-process-level load failures (did-fail-load fires for navigation errors)
    win.webContents.on('did-fail-load', (_event, code, desc, url) => {
      if (retries > 0 && retries <= MAX_RETRIES) return; // already retrying
      if (code === -102 || code === -105) { // ERR_CONNECTION_REFUSED or ERR_NAME_NOT_RESOLVED
        retries++;
        if (retries <= MAX_RETRIES) {
          console.log(`[STARTUP] Dev server not ready (${desc}), retrying in ${RETRY_MS}ms… (${retries}/${MAX_RETRIES})`);
          setTimeout(tryLoad, RETRY_MS);
        }
      }
    });

    tryLoad();
  } else {
    // Production — load built HTML directly, no retry needed
    const indexPath = join(__dirname, '../renderer/index.html');
    win.loadFile(indexPath).catch((err) => {
      console.error('[STARTUP] Failed to load production index.html:', err.message);
    });
  }

  return win;
}
