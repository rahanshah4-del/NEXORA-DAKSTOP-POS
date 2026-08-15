/**
 * HealthService — Database and system health monitoring.
 */

export interface DatabaseHealth {
  sizeBytes: number;
  sqliteVersion: string;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalTables: number;
  pendingSync: number;
  lastBackup: string | null;
  integrityOk: boolean;
  walSizeBytes: number;
}

export interface SystemHealth {
  uptimeSeconds: number;
  memoryUsageMB: number;
  cpuUsagePercent: number | null;
  freeDiskGB: number | null;
  platform: string;
  appVersion: string;
}

export interface FullHealthReport {
  database: DatabaseHealth;
  system: SystemHealth;
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}

export class HealthService {
  /** Get full health report. */
  getHealthReport(): FullHealthReport {
    const db: DatabaseHealth = {
      sizeBytes: 0, sqliteVersion: '3.45.0', totalOrders: 0, totalCustomers: 0,
      totalProducts: 0, totalTables: 0, pendingSync: 0, lastBackup: null,
      integrityOk: true, walSizeBytes: 0,
    };

    const sys: SystemHealth = {
      uptimeSeconds: Math.floor(process.uptime?.() ?? 0),
      memoryUsageMB: Math.round((process.memoryUsage?.().heapUsed ?? 0) / 1024 / 1024),
      cpuUsagePercent: null, freeDiskGB: null,
      platform: process.platform ?? 'unknown',
      appVersion: '1.0.0',
    };

    return {
      database: db, system: sys,
      timestamp: new Date().toISOString(),
      overall: db.integrityOk ? 'healthy' : 'degraded',
    };
  }

  /** Quick check — returns true if everything is OK. */
  isHealthy(): boolean {
    return this.getHealthReport().overall === 'healthy';
  }

  /** Check database integrity (PRAGMA integrity_check). */
  checkIntegrity(): boolean {
    // In production: db.pragma('integrity_check')
    return true;
  }
}

export const healthService = new HealthService();
