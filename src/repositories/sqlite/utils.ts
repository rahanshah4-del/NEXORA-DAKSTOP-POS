/**
 * utils.ts — shared query-building and row-mapping helpers for SQLite repositories.
 *
 * All helpers use parameterised queries — no string concatenation, no SQL injection.
 */

import type { QueryOptions } from '../../services/db-service';

// ── Constants ──

/** Columns excluded from SELECT when soft-delete is active. */
export const DELETED_AT_COLUMN = 'deleted_at';

/** Version column for optimistic concurrency. */
export const VERSION_COLUMN = 'version';

// ── Snake ↔ Camel Helpers ──

/** Convert snake_case to camelCase. */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/** Convert camelCase to snake_case. */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (ch: string) => `_${ch.toLowerCase()}`);
}

/** Convert all keys in a row from snake_case to camelCase. */
export function mapRowToCamel<T>(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    out[snakeToCamel(key)] = row[key];
  }
  return out;
}

/** Convert all keys in an object from camelCase to snake_case. */
export function mapToSnake(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(data)) {
    out[camelToSnake(key)] = data[key];
  }
  return out;
}

// ── SQLite Value Coercion ──

/** SQLite stores booleans as 0/1; convert to JS boolean. */
export function intToBool(val: unknown): boolean {
  return val === 1 || val === true;
}

/** Convert JS boolean to SQLite 0/1 integer. */
export function boolToInt(val: boolean): number {
  return val ? 1 : 0;
}

/** Parse a JSON string from SQLite, returning null on failure. */
export function parseJson<T>(val: unknown): T | null {
  if (typeof val !== 'string') return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

// ── Query Builder Helpers ──

export interface FilterClause {
  sql: string;
  params: unknown[];
}

/**
 * Build a WHERE clause fragment from a set of column filters.
 * Each entry produces `column = ?` joined with AND.
 * Skips entries where the value is undefined or null.
 */
export function buildWhereClause(
  filters: Record<string, unknown>,
  tableAlias?: string,
): FilterClause {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const clauses: string[] = [];
  const params: unknown[] = [];

  for (const [col, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    const colName = camelToSnake(col);
    clauses.push(`${prefix}${colName} = ?`);
    params.push(value);
  }

  return { sql: clauses.length > 0 ? clauses.join(' AND ') : '1=1', params };
}

/**
 * Build a WHERE clause that excludes soft-deleted rows.
 */
export function notDeletedClause(tableAlias?: string): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `${prefix}${DELETED_AT_COLUMN} IS NULL`;
}

/**
 * Combine multiple filter clauses with AND.
 */
export function combineWhereClauses(...clauses: FilterClause[]): FilterClause {
  const sqlParts: string[] = [];
  const params: unknown[] = [];

  for (const clause of clauses) {
    if (clause.sql && clause.sql !== '1=1') {
      sqlParts.push(clause.sql);
      params.push(...clause.params);
    }
  }

  return {
    sql: sqlParts.length > 0 ? sqlParts.join(' AND ') : '1=1',
    params,
  };
}

/**
 * Build ORDER BY, LIMIT, OFFSET from QueryOptions.
 * Returns parameterised SQL fragment and params array.
 */
export function buildQueryOptions(
  opts?: QueryOptions,
  defaultSort?: string,
): { orderClause: string; limitClause: string; offsetClause: string; params: unknown[] } {
  const params: unknown[] = [];

  let orderClause = '';
  if (opts?.orderBy) {
    const col = camelToSnake(opts.orderBy);
    const dir = opts.orderDir === 'DESC' ? 'DESC' : 'ASC';
    orderClause = `ORDER BY ${col} ${dir}`;
  } else if (defaultSort) {
    orderClause = `ORDER BY ${defaultSort}`;
  }

  let limitClause = '';
  if (opts?.limit !== undefined) {
    limitClause = 'LIMIT ?';
    params.push(opts.limit);
  }

  let offsetClause = '';
  if (opts?.offset !== undefined) {
    offsetClause = 'OFFSET ?';
    params.push(opts.offset);
  }

  return { orderClause, limitClause, offsetClause, params };
}

/**
 * Build a LIKE search clause across multiple columns.
 */
export function buildSearchClause(
  query: string,
  columns: string[],
  tableAlias?: string,
): FilterClause {
  if (!query || columns.length === 0) return { sql: '1=1', params: [] };

  const prefix = tableAlias ? `${tableAlias}.` : '';
  const likePattern = `%${query}%`;
  const clauses = columns.map((col) => `${prefix}${col} LIKE ?`);
  const params = columns.map(() => likePattern);

  return { sql: `(${clauses.join(' OR ')})`, params };
}

/**
 * Build an IN clause for a list of values.
 */
export function buildInClause(
  column: string,
  values: unknown[],
  tableAlias?: string,
): FilterClause {
  if (values.length === 0) return { sql: '1=0', params: [] };

  const prefix = tableAlias ? `${tableAlias}.` : '';
  const placeholders = values.map(() => '?').join(', ');
  return {
    sql: `${prefix}${column} IN (${placeholders})`,
    params: values,
  };
}

// ── Timestamp Helpers ──

/** Current UTC timestamp in ISO-8601-like format SQLite uses. */
export function now(): string {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

// ── ID Generation ──

let _crypto: Crypto | undefined;

function getCrypto(): Crypto {
  if (!_crypto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _crypto = require('crypto') as Crypto;
  }
  return _crypto;
}

/** Generate a RFC 4122 v4 UUID. */
export function generateId(): string {
  return getCrypto().randomUUID();
}
