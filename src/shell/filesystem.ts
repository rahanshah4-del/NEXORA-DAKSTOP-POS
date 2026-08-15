/**
 * filesystem.ts — Filesystem operations for the POS application.
 *
 * Manages:
 *   - Database backups
 *   - Report exports (CSV, JSON, PDF)
 *   - Settings import/export
 *   - Application logs
 *   - Temporary files
 */

import { app } from 'electron';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
  unlinkSync,
  statSync,
  rmdirSync,
} from 'fs';
import { join, dirname } from 'path';

// ── Paths ──

export function getAppDataPath(): string {
  const path = app.getPath('userData');
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function getBackupPath(): string {
  const path = join(getAppDataPath(), 'backups');
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function getExportPath(): string {
  const path = join(getAppDataPath(), 'exports');
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function getLogsPath(): string {
  const path = join(getAppDataPath(), 'logs');
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function getTempPath(): string {
  const path = join(getAppDataPath(), 'temp');
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function getDatabasePath(): string {
  return join(getAppDataPath(), 'nexora.db');
}

// ── Database Backups ──

export interface BackupInfo {
  name: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Create a timestamped backup of the SQLite database.
 */
export function createDatabaseBackup(): BackupInfo | null {
  const dbPath = getDatabasePath();
  if (!existsSync(dbPath)) return null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `nexora-backup-${timestamp}.db`;
  const backupPath = join(getBackupPath(), backupName);

  try {
    copyFileSync(dbPath, backupPath);
    const stats = statSync(backupPath);
    return {
      name: backupName,
      path: backupPath,
      sizeBytes: stats.size,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * List all available database backups.
 */
export function listBackups(): BackupInfo[] {
  const backupDir = getBackupPath();
  if (!existsSync(backupDir)) return [];

  try {
    return readdirSync(backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((name) => {
        const fullPath = join(backupDir, name);
        const stats = statSync(fullPath);
        return {
          name,
          path: fullPath,
          sizeBytes: stats.size,
          createdAt: stats.birthtime.toISOString(),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

/**
 * Restore a database backup (copies backup over current DB).
 * Current DB is backed up first as a safety measure.
 */
export function restoreDatabaseBackup(backupName: string): boolean {
  const backupPath = join(getBackupPath(), backupName);
  if (!existsSync(backupPath)) return false;

  try {
    // Safety: backup current DB first
    createDatabaseBackup();

    // Copy backup over current DB
    const dbPath = getDatabasePath();
    copyFileSync(backupPath, dbPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a database backup.
 */
export function deleteBackup(backupName: string): boolean {
  const backupPath = join(getBackupPath(), backupName);
  if (!existsSync(backupPath)) return false;

  try {
    unlinkSync(backupPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prune old backups, keeping only the most recent `keepCount`.
 */
export function pruneBackups(keepCount: number = 5): number {
  const backups = listBackups();
  let deleted = 0;

  for (const backup of backups.slice(keepCount)) {
    try {
      unlinkSync(backup.path);
      deleted++;
    } catch { /* skip */ }
  }

  return deleted;
}

// ── Report Export ──

export type ExportFormat = 'json' | 'csv';

/**
 * Export data to a file.
 */
export function exportData(
  data: unknown,
  filename: string,
  format: ExportFormat,
): string | null {
  const exportDir = getExportPath();
  const fullPath = join(exportDir, filename);

  try {
    if (format === 'json') {
      writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
    } else if (format === 'csv') {
      const csv = convertToCsv(data as Record<string, unknown>[]);
      writeFileSync(fullPath, csv, 'utf-8');
    }
    return fullPath;
  } catch {
    return null;
  }
}

/**
 * Convert an array of objects to CSV string.
 */
function convertToCsv(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const value = String(row[h] ?? '');
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      })
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

// ── Settings Import/Export ──

export function exportSettings(settings: Record<string, unknown>): string | null {
  return exportData(settings, 'settings-export.json', 'json');
}

export function importSettings(filePath: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Log File Management ──

/**
 * Write a log entry to the daily log file.
 */
export function writeLogEntry(level: string, message: string, meta?: Record<string, unknown>): void {
  const logsDir = getLogsPath();
  const today = new Date().toISOString().split('T')[0];
  const logFile = join(logsDir, `nexora-${today}.log`);

  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;

  try {
    writeFileSync(logFile, line, { flag: 'a' });
  } catch { /* silently fail — logging is non-critical */ }
}

/**
 * Read log entries from a specific date.
 */
export function readLogs(date: string): string[] {
  const logsDir = getLogsPath();
  const logFile = join(logsDir, `nexora-${date}.log`);

  if (!existsSync(logFile)) return [];

  try {
    const content = readFileSync(logFile, 'utf-8');
    return content.trim().split('\n');
  } catch {
    return [];
  }
}

/**
 * Get available log dates.
 */
export function getLogDates(): string[] {
  const logsDir = getLogsPath();
  if (!existsSync(logsDir)) return [];

  try {
    return readdirSync(logsDir)
      .filter((f) => f.startsWith('nexora-') && f.endsWith('.log'))
      .map((f) => f.replace('nexora-', '').replace('.log', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Prune log files older than `retentionDays`.
 */
export function pruneLogs(retentionDays: number = 30): number {
  const logsDir = getLogsPath();
  if (!existsSync(logsDir)) return 0;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  try {
    for (const file of readdirSync(logsDir)) {
      const filePath = join(logsDir, file);
      const stats = statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        unlinkSync(filePath);
        deleted++;
      }
    }
  } catch { /* skip */ }

  return deleted;
}

// ── Temp Files ──

/**
 * Create a temp file path.
 */
export function createTempFilePath(prefix: string, ext: string): string {
  const tempDir = getTempPath();
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return join(tempDir, `${prefix}-${timestamp}-${random}.${ext}`);
}

/**
 * Clean up all temp files.
 */
export function cleanTempFiles(): number {
  const tempDir = getTempPath();
  if (!existsSync(tempDir)) return 0;

  let deleted = 0;
  try {
    for (const file of readdirSync(tempDir)) {
      try {
        unlinkSync(join(tempDir, file));
        deleted++;
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return deleted;
}

// ── Disk Space ──

/**
 * Get total disk usage for the app data directory.
 */
export function getAppDataSizeBytes(): number {
  const appDataPath = getAppDataPath();
  return getDirectorySize(appDataPath);
}

function getDirectorySize(dirPath: string): number {
  if (!existsSync(dirPath)) return 0;

  let size = 0;
  try {
    for (const file of readdirSync(dirPath)) {
      const filePath = join(dirPath, file);
      const stats = statSync(filePath);
      if (stats.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
  } catch { /* skip */ }
  return size;
}
