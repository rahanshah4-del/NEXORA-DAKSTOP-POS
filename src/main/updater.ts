import { BrowserWindow, app } from 'electron';
import { autoUpdater } from 'electron-updater';

const log = {
  info: (...args: unknown[]) => console.log('[Updater]', ...args),
  warn: (...args: unknown[]) => console.warn('[Updater]', ...args),
  error: (...args: unknown[]) => console.error('[Updater]', ...args),
};

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
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
