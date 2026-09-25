import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { createMainWindow, persistWindowState } from './window';
import { buildAppMenu } from './menu';
import { setupAutoUpdater } from './updater';
import { startSyncDrain, stopSyncDrain } from './sync-drain';

// ── .env is a DEV-ONLY convenience ──
// The packaged app must never read a .env: a stray file next to the .exe with
// NODE_ENV=development used to be enough to send the production build at a
// dev server that isn't there (white screen). Firebase config is inlined at
// build time by electron.vite.config.ts, so nothing here needs .env to run.
//
// Loading via require (not a top-level import) is deliberate: `app` has to be
// available to test isPackaged, and ES imports are hoisted above statements.
// Safe because no module read at import time depends on .env — the only
// import-time process.env reads are the FIREBASE_* ones, and those are
// replaced with literals at build time.
if (!app.isPackaged) {
  require('dotenv/config');
}

let mainWindow: BrowserWindow | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // ── Database bootstrap (must run BEFORE IPC handlers that use the DB) ──
    try {
      const { getDatabase } = await import('../database/connection');
      const { runMigrations } = await import('../database/migrations');
      const db = getDatabase();
      runMigrations();

      // Integrity check
      const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      const ok = integrity?.[0]?.integrity_check === 'ok';
      console.log('[STARTUP] Database ready. Integrity:', ok ? 'OK' : 'FAILED');
    } catch (err: any) {
      // A packaged app has no console anyone can see. Without a dialog this
      // failure looks exactly like "the app does nothing when I click it" —
      // which is what a wrong-platform better_sqlite3.node produces.
      const dbPath = join(app.getPath('userData'), 'nexora.db');
      const detail = err?.stack || err?.message || String(err);
      console.error('[STARTUP] FATAL: Database initialisation failed:', detail);
      dialog.showErrorBox(
        'Nexora POS could not start',
        `The local database could not be opened.\n\n` +
          `Database file:\n${dbPath}\n\n` +
          `Error:\n${detail}`,
      );
      app.quit();
      return;
    }

    mainWindow = createMainWindow();
    registerIpcHandlers(mainWindow);
    setupAutoUpdater(mainWindow);

    // Arm the offline sync drain engine (drains sync_queue → Firestore).
    // This only attaches the auth listener — the drain loop itself starts when
    // Firebase reports a signed-in user and stops again on sign-out.
    startSyncDrain();

    const menu = buildAppMenu(mainWindow);
    Menu.setApplicationMenu(menu);

    mainWindow.on('close', () => {
      if (mainWindow) {
        persistWindowState(mainWindow);
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
      registerIpcHandlers(mainWindow);
    }
  });

  app.on('before-quit', () => {
    stopSyncDrain();
    if (mainWindow) {
      persistWindowState(mainWindow);
    }
  });
}
