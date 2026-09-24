// ── Load .env before ANY other imports ──
import 'dotenv/config';

import { app, BrowserWindow, ipcMain, Menu, screen } from 'electron';
import { join } from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { createMainWindow, persistWindowState } from './window';
import { buildAppMenu } from './menu';
import { setupAutoUpdater } from './updater';
import { startSyncDrain, stopSyncDrain } from './sync-drain';

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
      console.error('[STARTUP] FATAL: Database initialisation failed:', err.message);
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
