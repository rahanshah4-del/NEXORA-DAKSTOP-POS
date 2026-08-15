/**
 * crash-recovery.ts — Global error handling, crash recovery, and auto-restart.
 *
 * Catches:
 *   - Uncaught exceptions in the main process
 *   - Unhandled promise rejections
 *   - Renderer process crashes (gpu, renderer-gone)
 *   - Window unresponsive events
 *
 * Recovery:
 *   - Logs all errors to persistent log files
 *   - Auto-restarts the application after a crash
 *   - Shows a recovery dialog if the renderer crashes repeatedly
 */

import { app, BrowserWindow, dialog, crashReporter } from 'electron';
import { writeLogEntry, getLogsPath } from './filesystem';

// ── State ──

interface CrashState {
  crashCount: number;
  lastCrashAt: string | null;
  isRecovering: boolean;
  restartWindow: BrowserWindow | null;
}

const state: CrashState = {
  crashCount: 0,
  lastCrashAt: null,
  isRecovering: false,
  restartWindow: null,
};

const MAX_CRASHES_BEFORE_DIALOG = 3;
const CRASH_RESET_WINDOW_MS = 60_000; // Reset crash count after 1 min of stability

// ── Logging ──

function logCrash(type: string, error: Error | string): void {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;

  writeLogEntry('error', `[CRASH:${type}] ${message}`, {
    stack: stack?.split('\n').slice(0, 5),
    crashCount: state.crashCount,
    timestamp: new Date().toISOString(),
  });

  console.error(`[CRASH:${type}]`, message);
  if (stack) console.error(stack);
}

// ── Crash Reporter ──

/**
 * Initialise Electron's built-in crash reporter.
 * Reports are saved locally only (no cloud upload).
 */
export function initCrashReporter(): void {
  crashReporter.start({
    productName: 'NexoraSolutionPOS',
    companyName: 'Nexora Solution',
    submitURL: '', // No remote submission — local only
    uploadToServer: false,
    compress: true,
  });
}

// ── Global Error Handlers ──

/**
 * Register all global error handlers for the main process.
 */
export function registerGlobalErrorHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    state.crashCount++;
    state.lastCrashAt = new Date().toISOString();
    logCrash('uncaughtException', error);

    // Attempt graceful shutdown
    try {
      const wins = BrowserWindow.getAllWindows();
      for (const win of wins) {
        if (!win.isDestroyed()) {
          win.webContents.send('app:crash', { message: error.message });
        }
      }
    } catch { /* last resort */ }

    // Don't exit — let the app try to continue
    // Only exit for truly unrecoverable errors (e.g., OOM)
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logCrash('unhandledRejection', error);
    console.error('[UNHANDLED REJECTION]', error.message);
  });

  // Renderer process gone
  app.on('render-process-gone', (_event, _webContents, details) => {
    state.crashCount++;
    state.lastCrashAt = new Date().toISOString();
    logCrash('renderer-gone', new Error(`Renderer crashed: ${details.reason} (exit code ${details.exitCode})`));

    if (state.crashCount >= MAX_CRASHES_BEFORE_DIALOG) {
      showCrashRecoveryDialog();
    }
  });

  // GPU process crash
  app.on('child-process-gone', (_event, details) => {
    if (details.type === 'GPU') {
      logCrash('gpu-crash', new Error(`GPU process crashed: ${details.reason}`));
    }
  });

  // Window unresponsive
  app.on('browser-window-created', (_event, window) => {
    window.on('unresponsive', () => {
      logCrash('unresponsive', new Error(`Window became unresponsive`));
    });
  });
}

// ── Recovery Dialog ──

function showCrashRecoveryDialog(): void {
  if (state.isRecovering) return;
  state.isRecovering = true;

  const options: Electron.MessageBoxOptions = {
    type: 'error',
    title: 'Nexora Solution POS — Recovery',
    message: 'The application has crashed multiple times.',
    detail:
      'Would you like to:\n\n' +
      '• Restart the application\n' +
      '• Reset to default settings\n' +
      '• View crash logs',
    buttons: ['Restart', 'Reset & Restart', 'View Logs', 'Quit'],
    defaultId: 0,
    cancelId: 3,
    noLink: true,
  };

  // Find any existing window to attach the dialog
  const existingWindows = BrowserWindow.getAllWindows();
  const parent = existingWindows.length > 0 ? existingWindows[0] : undefined;

  if (parent && !parent.isDestroyed()) {
    dialog.showMessageBox(parent, options).then(({ response }) => {
      handleRecoveryChoice(response);
    });
  } else {
    // No window available — just restart
    handleRecoveryChoice(0);
  }
}

function handleRecoveryChoice(choice: number): void {
  switch (choice) {
    case 0: // Restart
      restartApplication();
      break;
    case 1: // Reset & Restart
      resetAndRestart();
      break;
    case 2: // View Logs
      openCrashLogs();
      break;
    case 3: // Quit
    default:
      app.quit();
      break;
  }
}

// ── Restart Logic ──

/**
 * Restart the application gracefully.
 */
export function restartApplication(): void {
  state.crashCount = 0;
  state.lastCrashAt = null;
  state.isRecovering = false;

  app.relaunch();
  app.exit(0);
}

/**
 * Reset settings and restart.
 */
function resetAndRestart(): void {
  try {
    const { getAppDataPath } = require('./filesystem');
    const { existsSync, unlinkSync } = require('fs');
    const { join } = require('path');

    const userDataPath = getAppDataPath();

    // Only remove window state — preserve DB
    const windowStateFile = join(userDataPath, 'window-state.json');
    if (existsSync(windowStateFile)) {
      unlinkSync(windowStateFile);
    }
  } catch { /* best effort */ }

  restartApplication();
}

/**
 * Open crash logs in the system file explorer.
 */
function openCrashLogs(): void {
  const { shell } = require('electron');
  const logsPath = getLogsPath();
  shell.openPath(logsPath).catch(() => {});
  state.isRecovering = false;
}

// ── Stability Timer ──

let stabilityTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Mark the application as stable. Resets the crash counter.
 * Call this after successful startup + first successful render.
 */
export function markStable(): void {
  state.crashCount = 0;

  if (stabilityTimer) clearTimeout(stabilityTimer);
  stabilityTimer = setTimeout(() => {
    state.crashCount = 0;
    writeLogEntry('info', 'Application marked as stable');
  }, CRASH_RESET_WINDOW_MS);
}

// ── Health Check ──

export interface HealthStatus {
  healthy: boolean;
  uptimeSeconds: number;
  crashCount: number;
  lastCrashAt: string | null;
  memoryUsageMB: number;
  rendererAlive: boolean;
}

/**
 * Get current health status of the application.
 */
export function getHealthStatus(): HealthStatus {
  const memUsage = process.memoryUsage();
  const windows = BrowserWindow.getAllWindows();

  return {
    healthy: state.crashCount < MAX_CRASHES_BEFORE_DIALOG,
    uptimeSeconds: Math.floor(process.uptime()),
    crashCount: state.crashCount,
    lastCrashAt: state.lastCrashAt,
    memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    rendererAlive: windows.length > 0 && windows.every((w) => !w.isDestroyed()),
  };
}
