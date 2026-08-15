/**
 * TableService — Restaurant table management and allocation logic.
 *
 * Orchestrates: TableRepository
 * Uses engines: TableAllocation
 */

import type { Table } from '../../../types/models';
import type { TableStatus } from '../../../types/enums';
import type { ITableRepository } from '../../../repositories/ITableRepository';
import { TableAllocation, type AllocationRequest, type SectionAvailability } from './engines/table-allocation';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors: [] };
}

// ── Types ──

export interface CreateTableInput {
  name: string;
  section?: string | null;
  capacity: number;
  positionX?: number | null;
  positionY?: number | null;
}

export interface UpdateTableInput {
  tableId: string;
  name?: string;
  section?: string | null;
  capacity?: number;
  positionX?: number | null;
  positionY?: number | null;
}

// ── Service ──

export class TableService {
  private readonly allocator = new TableAllocation();

  constructor(private tableRepo: ITableRepository) {}

  // ── CRUD ──

  async createTable(input: CreateTableInput): Promise<ServiceResult<Table>> {
    if (!input.name || input.name.trim().length === 0) {
      return fail('Table name is required');
    }
    if (input.capacity < 1) {
      return fail('Table capacity must be at least 1');
    }

    const table = await this.tableRepo.create({
      name: input.name.trim(),
      section: input.section ?? null,
      capacity: input.capacity,
      positionX: input.positionX ?? null,
      positionY: input.positionY ?? null,
      status: 'available' as TableStatus,
    } as Partial<Table>);

    return ok(table);
  }

  async updateTable(input: UpdateTableInput): Promise<ServiceResult<Table>> {
    const existing = await this.tableRepo.findById(input.tableId);
    if (!existing) return fail(`Table not found: ${input.tableId}`);

    const updates: Partial<Table> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.section !== undefined) updates.section = input.section;
    if (input.capacity !== undefined) updates.capacity = input.capacity;
    if (input.positionX !== undefined) updates.positionX = input.positionX;
    if (input.positionY !== undefined) updates.positionY = input.positionY;

    const table = await this.tableRepo.update(input.tableId, updates);
    return ok(table);
  }

  async deleteTable(tableId: string): Promise<ServiceResult<void>> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) return fail(`Table not found: ${tableId}`);
    if (table.status === 'occupied') {
      return fail('Cannot delete an occupied table');
    }
    await this.tableRepo.delete(tableId);
    return ok(undefined);
  }

  // ── Status Management ──

  async updateStatus(tableId: string, status: TableStatus): Promise<ServiceResult<void>> {
    await this.tableRepo.updateStatus(tableId, status);
    return ok(undefined);
  }

  async assignOrder(tableId: string, orderId: string): Promise<ServiceResult<void>> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) return fail(`Table not found: ${tableId}`);
    if (table.status === 'maintenance') return fail('Table is under maintenance');

    await this.tableRepo.assignOrder(tableId, orderId);
    await this.tableRepo.updateStatus(tableId, 'occupied');
    return ok(undefined);
  }

  async clearTable(tableId: string): Promise<ServiceResult<void>> {
    await this.tableRepo.clearOrder(tableId);
    await this.tableRepo.updateStatus(tableId, 'available');
    return ok(undefined);
  }

  // ── Allocation ──

  /**
   * Find the best table for a party.
   */
  async allocateTable(request: AllocationRequest): Promise<ServiceResult<string[]>> {
    const allTables = await this.tableRepo.findAll();
    const available = allTables.filter((t) => t.status === 'available');

    const result = this.allocator.allocate(available, request);

    if (!result.success) {
      return fail(result.reason ?? 'No suitable table available');
    }

    return ok(result.tableIds);
  }

  /**
   * Get table availability across sections.
   */
  async getAvailability(): Promise<SectionAvailability[]> {
    const tables = await this.tableRepo.findAll();
    return this.allocator.getSectionAvailability(
      tables.map((t) => ({
        id: t.id,
        name: t.name,
        section: t.section,
        capacity: t.capacity,
        status: t.status,
        currentOrderId: t.currentOrderId,
      })),
    );
  }

  /**
   * Get the recommended capacity for a party size.
   */
  recommendCapacity(partySize: number): number {
    return this.allocator.recommendCapacity(partySize);
  }

  // ── Queries ──

  async getBySection(section: string): Promise<Table[]> {
    return this.tableRepo.findBySection(section);
  }

  async getAvailable(): Promise<Table[]> {
    return this.tableRepo.findAvailable();
  }

  async getByStatus(status: TableStatus): Promise<Table[]> {
    return this.tableRepo.findByStatus(status);
  }

  async getFloorLayout(): Promise<Table[]> {
    return this.tableRepo.findAll({ orderBy: 'name', orderDir: 'ASC' });
  }

  /**
   * Update a table's position on the floor plan.
   */
  async updatePosition(
    tableId: string,
    positionX: number,
    positionY: number,
  ): Promise<ServiceResult<void>> {
    await this.tableRepo.updatePosition(tableId, positionX, positionY);
    return ok(undefined);
  }
}
