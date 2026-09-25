import { BrowserWindow, app } from 'electron';
import { autoUpdater } from 'electron-updater';

const log = {
  info: (...args: unknown[]) => console.log('[Updater]', ...args),
  warn: (...args: unknown[]) => console.warn('[Updater]', ...args),
  error: (...args: unknown[]) => console.error('[Updater]', ...args),
};

/**
 * TODO(part-2): re-enable once a real update feed exists.
 *
 * electron-builder.yml publishes to https://nexorasolution.online/releases,
 * which currently returns 404 for latest.yml. Leaving this armed means every
 * packaged launch fires a failing check 5s in and again every 4h. The wiring
 * below is intentionally kept intact — flip this flag (and ship a signed build
 * with a reachable feed) to turn it back on.
 */
const AUTO_UPDATER_ENABLED = false;

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  if (!AUTO_UPDATER_ENABLED) {
    autoUpdater.logger = log;
    autoUpdater.logger?.info('Auto-updater disabled (no release feed configured yet)');
    return;
  }

  if (!app.isPackaged) {
    autoUpdater.logger = log;
    autoUpdater.logger?.info('Auto-updater disabled in development');
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('update:checking');
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', info);
    autoUpdater.downloadUpdate().catch((err) => {
      autoUpdater.logger?.error('Download failed:', err);
    });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:download-progress', progress);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', (error) => {
    autoUpdater.logger?.error('Update error:', error);
    mainWindow.webContents.send('update:error', error.message);
  });

  // Check on startup after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently handle — no internet or server unavailable
    });
  }, 5000);

  // Check every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

export function installUpdateAndRestart(): void {
  autoUpdater.quitAndInstall(true, true);
}
