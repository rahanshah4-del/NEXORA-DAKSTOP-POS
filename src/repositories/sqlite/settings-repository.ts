/**
 * SQLiteSettingsRepository — concrete SQLite implementation of ISettingsRepository.
 *
 * Manages the settings table (key-value store).
 * Extends IRepository<AppSetting> (not ISyncRepository).
 * Special: uses 'key' as the primary key, not 'id'.
 *
 * Still supports sync queueing per the global repository requirements.
 */

import type Database from 'better-sqlite3';
import type { AppSetting } from '../../types/models';
import type { ISettingsRepository } from '../ISettingsRepository';
import { generateId } from './utils';
import { enqueueSyncEntry } from './sync-queue';

export class SQLiteSettingsRepository implements ISettingsRepository {
  constructor(private db: Database.Database) {}

  // ── IRepository<AppSetting> ──

  async findAll(): Promise<AppSetting[]> {
    const rows = this.db
      .prepare('SELECT * FROM settings ORDER BY key ASC')
      .all() as Record<string, unknown>[];

    return rows.map((row) => this.toModel(row));
  }

  async findById(id: string): Promise<AppSetting | null> {
    // For settings, id == key
    const row = this.db
      .prepare('SELECT * FROM settings WHERE key = ?')
      .get(id) as Record<string, unknown> | undefined;

    return row ? this.toModel(row) : null;
  }

  async create(data: Partial<AppSetting>): Promise<AppSetting> {
    const key = data.key;
    if (!key) throw new Error('Setting key is required');

    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runCreate = this.db.transaction(() => {
      this.db
        .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
        .run(key, data.value ?? '', now);

      const row = this.db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get(key) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'settings', key, 'create', row);
      }

      return row;
    });

    const row = runCreate();
    return this.toModel(row as Record<string, unknown>);
  }

  async update(id: string, data: Partial<AppSetting>): Promise<AppSetting> {
    // id is the key for settings
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const value = data.value;

    const runUpdate = this.db.transaction(() => {
      if (value !== undefined) {
        this.db
          .prepare('UPDATE settings SET value = ?, updated_at = ? WHERE key = ?')
          .run(value, now, id);
      } else {
        this.db
          .prepare('UPDATE settings SET updated_at = ? WHERE key = ?')
          .run(now, id);
      }

      const row = this.db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get(id) as Record<string, unknown> | undefined;

      if (row) {
        enqueueSyncEntry(this.db, 'settings', id, 'update', row);
      }

      return row;
    });

    const row = runUpdate();
    if (!row) throw new Error(`Setting not found: ${id}`);
    return this.toModel(row as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    const runDelete = this.db.transaction(() => {
      const row = this.db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get(id) as Record<string, unknown> | undefined;

      if (!row) throw new Error(`Setting not found: ${id}`);

      this.db.prepare('DELETE FROM settings WHERE key = ?').run(id);

      enqueueSyncEntry(this.db, 'settings', id, 'delete', row);
    });

    runDelete();
  }

  async count(): Promise<number> {
    const row = this.db
      .prepare('SELECT COUNT(*) AS cnt FROM settings')
      .get() as { cnt: number } | undefined;

    return row?.cnt ?? 0;
  }

  async exists(id: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 FROM settings WHERE key = ? LIMIT 1').get(id);
    return row !== undefined;
  }

  // ── Domain-Specific Methods ──

  async get(key: string): Promise<string | null> {
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get(key) as { value: string } | undefined;

    return row?.value ?? null;
  }

  async getWithDefault(key: string, defaultValue: string): Promise<string> {
    const value = await this.get(key);
    return value ?? defaultValue;
  }

  async set(key: string, value: string): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runSet = this.db.transaction(() => {
      const existing = this.db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get(key) as Record<string, unknown> | undefined;

      this.db
        .prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
        .run(key, value, now);

      const row = this.db
        .prepare('SELECT * FROM settings WHERE key = ?')
        .get(key) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(
          this.db,
          'settings',
          key,
          existing ? 'update' : 'create',
          row,
        );
      }
    });

    runSet();
  }

  async setBatch(settings: Record<string, string>): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const entries = Object.entries(settings);
    if (entries.length === 0) return;

    const runBatch = this.db.transaction(() => {
      const stmt = this.db.prepare(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      );

      for (const [key, value] of entries) {
        const existing = this.db
          .prepare('SELECT * FROM settings WHERE key = ?')
          .get(key) as Record<string, unknown> | undefined;

        stmt.run(key, value, now);

        const row = this.db
          .prepare('SELECT * FROM settings WHERE key = ?')
          .get(key) as Record<string, unknown>;

        if (row) {
          enqueueSyncEntry(
            this.db,
            'settings',
            key,
            existing ? 'update' : 'create',
            row,
          );
        }
      }
    });

    runBatch();
  }

  async getAllAsMap(): Promise<Record<string, string>> {
    const rows = this.db
      .prepare('SELECT key, value FROM settings')
      .all() as { key: string; value: string }[];

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  async exportToJson(): Promise<string> {
    const map = await this.getAllAsMap();
    return JSON.stringify(map, null, 2);
  }

  async importFromJson(json: string): Promise<void> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON for settings import');
    }

    const settings: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        settings[key] = value;
      } else {
        settings[key] = String(value);
      }
    }

    await this.setBatch(settings);
  }

  async hasKey(key: string): Promise<boolean> {
    return this.exists(key);
  }

  // ── Row Mapping ──

  private toModel(row: Record<string, unknown>): AppSetting {
    return {
      key: row.key as string,
      value: row.value as string,
      updatedAt: row.updated_at as string,
    };
  }
}
