/**
 * Database Service — provides typed CRUD operations for all entities.
 * Uses IPC to communicate with the SQLite database in the main process.
 *
 * In production (Electron): calls window.api.db.query/execute
 * In development (browser): no-op stubs returning empty arrays
 */

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.api;
}

async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  if (!isElectron()) return [];
  return window.api.db.query(sql, params) as Promise<T[]>;
}

async function execute(sql: string, params?: unknown[]): Promise<{ changes: number }> {
  if (!isElectron()) return { changes: 0 };
  return window.api.db.execute(sql, params);
}

// ── Generic CRUD ──

export const dbService = {
  query,
  execute,

  async getAll<T>(table: string, opts: QueryOptions = {}): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];
    if (opts.orderBy) {
      sql += ` ORDER BY ${opts.orderBy} ${opts.orderDir ?? 'ASC'}`;
    }
    if (opts.limit) {
      sql += ` LIMIT ?`;
      params.push(opts.limit);
    }
    if (opts.offset) {
      sql += ` OFFSET ?`;
      params.push(opts.offset);
    }
    return query<T>(sql, params);
  },

  async getById<T>(table: string, id: string): Promise<T | null> {
    const rows = await query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] ?? null;
  },

  async insert(table: string, data: Record<string, unknown>): Promise<void> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    await execute(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
  },

  async update(table: string, id: string, data: Record<string, unknown>): Promise<void> {
    const setClauses = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);
    await execute(`UPDATE ${table} SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`, [
      ...values,
      id,
    ]);
  },

  async remove(table: string, id: string): Promise<void> {
    await execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  },

  async count(table: string, where?: string, params?: unknown[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    if (where) sql += ` WHERE ${where}`;
    const rows = await query<{ count: number }>(sql, params);
    return rows[0]?.count ?? 0;
  },
};
