/**
 * splash.ts — Splash screen shown during app startup.
 *
 * Displays the Nexora Solution logo and a loading indicator while:
 *   1. SQLite database is opened and migrated
 *   2. Dependency container is built
 *   3. IPC handlers are registered
 *   4. Main window content loads
 *
 * Auto-closes once the main window fires 'ready-to-show'.
 */

import { BrowserWindow } from 'electron';

// ── Splash Screen ──

let splashWindow: BrowserWindow | null = null;

/**
 * Create and show the splash screen.
 */
export function showSplashScreen(): BrowserWindow {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the splash HTML
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
  splashWindow.show();

  return splashWindow;
}

/**
 * Close and destroy the splash screen.
 */
export function closeSplashScreen(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

/**
 * Attach the splash close handler to a main window.
 * Closes splash when main window is ready to show.
 */
export function attachSplashToWindow(mainWindow: BrowserWindow): void {
  mainWindow.once('ready-to-show', () => {
    closeSplashScreen();
    if (mainWindow.isMaximized()) {
      mainWindow.maximize();
    }
    mainWindow.show();
    mainWindow.focus();
  });
}

// ── Splash HTML ──

const SPLASH_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: rgba(15, 23, 42, 0.97);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      user-select: none;
      -webkit-app-region: drag;
    }
    .logo {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: 2px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: breathe 2s ease-in-out infinite;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 32px;
      letter-spacing: 1px;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(0.97); opacity: 0.82; }
      50% { transform: scale(1); opacity: 1; }
    }
    .dots {
      display: flex;
      gap: 8px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8b5cf6;
      animation: dotPulse 1.2s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay: 150ms; }
    .dot:nth-child(3) { animation-delay: 300ms; }
    @keyframes dotPulse {
      0%, 60%, 100% { transform: scale(0.7); opacity: 0.35; }
      30% { transform: scale(1); opacity: 1; }
    }
    .version {
      position: absolute;
      bottom: 16px;
      font-size: 11px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="logo">NEXORA SOLUTION</div>
  <div class="subtitle">ENTERPRISE POS</div>
  <div class="dots">
    <div class="dot"></div>
    <div class="dot"></div>
    <div class="dot"></div>
  </div>
  <div class="version">v1.0.0</div>
</body>
</html>
`;
