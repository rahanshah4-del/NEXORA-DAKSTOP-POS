/**
 * Production Runtime — barrel export for all Phase 17 modules.
 *
 * Architecture: Additive layer on top of existing CQRS + IPC + SQLite stack.
 * Zero changes to existing files. All modules are independent singletons.
 */
// ── Events ──
export { IPC_EVENTS, EVENT_SCREEN_MAP, type IpcEventType, type IpcEventPayload } from './events/IpcEventBus';

// ── Cache ──
export { QueryCache, queryCache, type CacheEntry, type CacheConfig } from './cache/QueryCache';
export { useOptimisticMutation, type OptimisticOptions } from './cache/useOptimisticMutation';

// ── Sync ──
export { BackgroundSyncEngine, backgroundSync, type SyncQueueStats, type SyncEngineConfig } from './sync/BackgroundSyncEngine';

// ── Printing ──
export { ThermalPrinterService, printerService, type PrinterConfig, type PrintJobRequest, type PrintJobResult, type IPrinterProvider } from './printing/ThermalPrinterService';

// ── Hardware ──
export { BarcodeScannerService, barcodeScanner, type BarcodeFormat, type ScanResult } from './hardware/BarcodeScanner';
export { CashDrawerService, cashDrawer, type CashDrawerConfig } from './hardware/CashDrawer';

// ── Backup ──
export { BackupService, backupService, type BackupRecord, type BackupFrequency } from './backup/BackupService';

// ── Health ──
export { HealthService, healthService, type DatabaseHealth, type SystemHealth, type FullHealthReport } from './health/HealthService';

// ── Maintenance ──
export { AutoMaintenance, autoMaintenance, type MaintenanceSchedule } from './maintenance/AutoMaintenance';

// ── Recovery ──
export { CrashRecovery, crashRecovery, type RecoveryState } from './recovery/CrashRecovery';

// ── Audit ──
export { AuditLogger, auditLogger, type AuditEntry, type AuditAction } from './audit/AuditLogger';

// ── Monitor ──
export { PerformanceMonitor, perfMonitor, type TimingRecord, type PerformanceSnapshot } from './monitor/PerformanceMonitor';

// ── License ──
export { LicenseService, licenseService, type License, type LicenseType, type LicenseStatus } from './license/LicenseService';

// ── Config ──
export { TerminalConfigService, terminalConfig, type TerminalSettings } from './config/TerminalConfig';

// ── Notifications ──
export { NotificationCenter, notificationCenter, type AppNotification, type NotificationLevel } from './notifications/NotificationCenter';

// ── Diagnostics ──
export { HardwareDiagnostics, hardwareDiagnostics, type HardwareStatus, type DiagStatus } from './diagnostics/HardwareDiagnostics';

// ── Security ──
export { validateIpcPayload, IPC_VALIDATION_RULES, type ValidationRule } from './security/IpcSecurity';

// ── Packaging ──
export { PRODUCTION_PACKAGING, validateBuildConfig, type BuildTarget, type PackagingConfig, type VersionMetadata } from './packaging/BuildConfig';
