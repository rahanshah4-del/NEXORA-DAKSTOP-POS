/**
 * SQLiteStaffRepository — concrete SQLite implementation of IStaffRepository.
 *
 * Manages employees and shifts tables.
 * clockIn / clockOut run in transactions and enqueue sync queue entries.
 */

import type Database from 'better-sqlite3';
import type { Employee, Shift } from '../../types/models';
import type { UserRole } from '../../types/enums';
import type { IStaffRepository } from '../IStaffRepository';
import type { QueryOptions } from '../../services/db-service';
import { BaseSqliteRepository } from './base-repository';
import { buildQueryOptions, buildSearchClause, combineWhereClauses, notDeletedClause, generateId, intToBool, boolToInt } from './utils';
import { enqueueSyncEntry } from './sync-queue';

interface EmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  hourly_rate_cents: number | null;
  is_active: number;
  hire_date: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ShiftRow {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  notes: string | null;
  version: number;
  deleted_at: string | null;
  created_at: string;
}

export class SQLiteStaffRepository extends BaseSqliteRepository<Employee> implements IStaffRepository {
  protected tableName = 'employees';
  protected entityType = 'staff' as const;

  protected toModel(row: Record<string, unknown>): Employee {
    const r = row as unknown as EmployeeRow;
    return {
      id: r.id,
      userId: r.user_id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      role: r.role as UserRole,
      hourlyRateCents: r.hourly_rate_cents,
      isActive: intToBool(r.is_active),
      hireDate: r.hire_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  protected toDb(data: Partial<Employee>): Record<string, unknown> {
    const db: Record<string, unknown> = {};
    if (data.userId !== undefined) db.user_id = data.userId;
    if (data.firstName !== undefined) db.first_name = data.firstName;
    if (data.lastName !== undefined) db.last_name = data.lastName;
    if (data.email !== undefined) db.email = data.email;
    if (data.phone !== undefined) db.phone = data.phone;
    if (data.role !== undefined) db.role = data.role;
    if (data.hourlyRateCents !== undefined) db.hourly_rate_cents = data.hourlyRateCents;
    if (data.isActive !== undefined) db.is_active = boolToInt(data.isActive);
    if (data.hireDate !== undefined) db.hire_date = data.hireDate;
    return db;
  }

  async search(query: string, opts?: QueryOptions): Promise<Employee[]> {
    const searchClause = buildSearchClause(query, ['first_name', 'last_name', 'email']);
    const { orderClause, limitClause, offsetClause, params: optParams } = buildQueryOptions(opts, 'last_name ASC');

    const sql = [
      `SELECT * FROM ${this.tableName}`,
      `WHERE ${combineWhereClauses({ sql: notDeletedClause(), params: [] }, searchClause).sql}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    return this.getMany(sql, [...searchClause.params, ...optParams]);
  }

  async findByRole(role: UserRole): Promise<Employee[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE role = ? AND ${notDeletedClause()} ORDER BY last_name ASC, first_name ASC`,
      [role],
    );
  }

  async findActive(): Promise<Employee[]> {
    return this.getMany(
      `SELECT * FROM ${this.tableName} WHERE is_active = 1 AND ${notDeletedClause()} ORDER BY last_name ASC, first_name ASC`,
      [],
    );
  }

  async findByUserId(userId: string): Promise<Employee | null> {
    return this.getOne(
      `SELECT * FROM ${this.tableName} WHERE user_id = ? AND ${notDeletedClause()}`,
      [userId],
    );
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive } as Partial<Employee>);
  }

  async updateRole(id: string, role: UserRole): Promise<void> {
    await this.update(id, { role } as Partial<Employee>);
  }

  async updateHourlyRate(id: string, rateCents: number): Promise<void> {
    await this.update(id, { hourlyRateCents: rateCents } as Partial<Employee>);
  }

  // ── Shifts ──

  async clockIn(employeeId: string, notes?: string): Promise<Shift> {
    const id = generateId();
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    // Verify employee exists
    const employee = await this.findById(employeeId);
    if (!employee) throw new Error(`Employee not found: ${employeeId}`);

    // Check no active shift already
    const existing = await this.getActiveShift(employeeId);
    if (existing) throw new Error(`Employee ${employeeId} already has an active shift`);

    const runClockIn = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO shifts (id, employee_id, clock_in, clock_out, notes, version, created_at)
           VALUES (?, ?, ?, NULL, ?, 1, ?)`,
        )
        .run(id, employeeId, now, notes ?? null, now);

      const row = this.db
        .prepare('SELECT * FROM shifts WHERE id = ?')
        .get(id) as Record<string, unknown>;

      if (row) {
        enqueueSyncEntry(this.db, 'staff', id, 'create', row);
      }

      return row;
    });

    const row = runClockIn();
    return this.shiftToModel(row as Record<string, unknown>);
  }

  async clockOut(shiftId: string, notes?: string): Promise<Shift> {
    const now = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

    const runClockOut = this.db.transaction(() => {
      const shift = this.db
        .prepare('SELECT * FROM shifts WHERE id = ? AND deleted_at IS NULL')
        .get(shiftId) as Record<string, unknown> | undefined;

      if (!shift) throw new Error(`Shift not found: ${shiftId}`);
      if ((shift.clock_out as string | null) !== null) {
        throw new Error(`Shift ${shiftId} already clocked out`);
      }

      // Calculate minutes
      const clockInTime = new Date(shift.clock_in as string).getTime();
      const clockOutTime = new Date(now).getTime();
      const totalMinutes = Math.round((clockOutTime - clockInTime) / 60000);

      const setClauses = ['clock_out = ?', 'total_minutes = ?', 'version = version + 1'];
      const values: unknown[] = [now, totalMinutes];

      if (notes !== undefined) {
        // Append notes
        const existingNotes = (shift.notes as string) ?? '';
        setClauses.push('notes = ?');
        values.push(existingNotes ? `${existingNotes}; ${notes}` : notes);
      }

      values.push(shiftId);

      this.db
        .prepare(`UPDATE shifts SET ${setClauses.join(', ')} WHERE id = ?`)
        .run(...values);

      const updated = this.db
        .prepare('SELECT * FROM shifts WHERE id = ?')
        .get(shiftId) as Record<string, unknown>;

      if (updated) {
        enqueueSyncEntry(this.db, 'staff', shiftId, 'update', updated);
      }

      return updated;
    });

    const row = runClockOut();
    return this.shiftToModel(row as Record<string, unknown>);
  }

  async getActiveShift(employeeId: string): Promise<Shift | null> {
    const row = this.db
      .prepare(
        'SELECT * FROM shifts WHERE employee_id = ? AND clock_out IS NULL AND deleted_at IS NULL LIMIT 1',
      )
      .get(employeeId) as Record<string, unknown> | undefined;

    return row ? this.shiftToModel(row) : null;
  }

  async getShifts(employeeId: string, opts?: QueryOptions): Promise<Shift[]> {
    const { orderClause, limitClause, offsetClause, params } = buildQueryOptions(
      opts,
      'created_at DESC',
    );

    const sql = [
      `SELECT * FROM shifts`,
      `WHERE employee_id = ? AND ${notDeletedClause()}`,
      orderClause,
      limitClause,
      offsetClause,
    ]
      .filter(Boolean)
      .join(' ');

    const rows = this.db
      .prepare(sql)
      .all(employeeId, ...params) as Record<string, unknown>[];

    return rows.map((row) => this.shiftToModel(row));
  }

  async getActiveShifts(): Promise<Shift[]> {
    const rows = this.db
      .prepare(
        `SELECT s.* FROM shifts s
         JOIN employees e ON s.employee_id = e.id
         WHERE s.clock_out IS NULL AND s.deleted_at IS NULL AND e.deleted_at IS NULL
         ORDER BY s.created_at ASC`,
      )
      .all() as Record<string, unknown>[];

    return rows.map((row) => this.shiftToModel(row));
  }

  async getShiftsByDateRange(startDate: string, endDate: string): Promise<Shift[]> {
    const rows = this.db
      .prepare(
        `SELECT * FROM shifts
         WHERE created_at >= ? AND created_at <= ? AND ${notDeletedClause()}
         ORDER BY created_at DESC`,
      )
      .all(startDate, endDate) as Record<string, unknown>[];

    return rows.map((row) => this.shiftToModel(row));
  }

  // ── Shift Row Mapping ──

  private shiftToModel(row: Record<string, unknown>): Shift {
    const r = row as unknown as ShiftRow;
    return {
      id: r.id,
      employeeId: r.employee_id,
      employeeName: (row as Record<string, unknown>).employee_name as string | null ?? null,
      clockIn: r.clock_in,
      clockOut: r.clock_out,
      totalMinutes: r.total_minutes,
      notes: r.notes,
      createdAt: r.created_at,
    };
  }
}
