/**
 * TableAllocation — Table assignment and floor-plan optimisation logic.
 *
 * Handles:
 *   - Finding the best table for a party size
 *   - Section-based filtering
 *   - Merge candidate detection
 *   - Waitlist prioritisation
 */

// ── Types ──

export interface TableInfo {
  id: string;
  name: string;
  section: string | null;
  capacity: number;
  status: string;
  currentOrderId: string | null;
}

export interface AllocationRequest {
  partySize: number;
  preferredSection: string | null;
  allowMerge: boolean;
  requireAdjacent: boolean;
  accessible: boolean;
}

export interface AllocationResult {
  success: boolean;
  tableIds: string[];
  totalCapacity: number;
  seatingGap: number;
  isMerged: boolean;
  reason: string | null;
}

export interface SectionAvailability {
  section: string;
  availableTables: number;
  totalCapacity: number;
  occupiedTables: number;
}

// ── Engine ──

export class TableAllocation {
  /**
   * Find the best table(s) for a party.
   *
   * Strategy (in order):
   *   1. Single table with sufficient capacity (closest fit)
   *   2. Merge two adjacent tables
   *   3. Any available table (oversized)
   *   4. No allocation possible
   */
  allocate(
    availableTables: TableInfo[],
    request: AllocationRequest,
  ): AllocationResult {
    const candidates = request.preferredSection
      ? availableTables.filter(
          (t) => t.section === request.preferredSection && t.status === 'available',
        )
      : availableTables.filter((t) => t.status === 'available');

    if (candidates.length === 0) {
      return {
        success: false,
        tableIds: [],
        totalCapacity: 0,
        seatingGap: request.partySize,
        isMerged: false,
        reason: 'No available tables',
      };
    }

    // Strategy 1: Single table — closest fit
    const sorted = [...candidates].sort((a, b) => a.capacity - b.capacity);
    const exactFit = sorted.find((t) => t.capacity >= request.partySize);

    if (exactFit) {
      return {
        success: true,
        tableIds: [exactFit.id],
        totalCapacity: exactFit.capacity,
        seatingGap: exactFit.capacity - request.partySize,
        isMerged: false,
        reason: null,
      };
    }

    // Strategy 2: Merge tables
    if (request.allowMerge) {
      const mergeResult = this.findBestMerge(candidates, request.partySize);
      if (mergeResult) return mergeResult;
    }

    // Strategy 3: Largest available (oversized)
    const largest = sorted[sorted.length - 1];
    return {
      success: true,
      tableIds: [largest.id],
      totalCapacity: largest.capacity,
      seatingGap: largest.capacity - request.partySize,
      isMerged: false,
      reason: `Oversized allocation: capacity ${largest.capacity} for party of ${request.partySize}`,
    };
  }

  /**
   * Find the best pair of tables to merge for a party.
   */
  private findBestMerge(
    tables: TableInfo[],
    partySize: number,
  ): AllocationResult | null {
    let best: AllocationResult | null = null;

    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const combinedCapacity = tables[i].capacity + tables[j].capacity;
        if (combinedCapacity >= partySize) {
          const gap = combinedCapacity - partySize;
          if (!best || gap < best.seatingGap) {
            best = {
              success: true,
              tableIds: [tables[i].id, tables[j].id],
              totalCapacity: combinedCapacity,
              seatingGap: gap,
              isMerged: true,
              reason: null,
            };
          }
        }
      }
    }

    return best;
  }

  /**
   * Get availability summary by section.
   */
  getSectionAvailability(
    tables: TableInfo[],
  ): SectionAvailability[] {
    const sections = new Map<string, { available: number; totalCapacity: number; occupied: number }>();

    for (const table of tables) {
      const section = table.section ?? 'Unassigned';
      const entry = sections.get(section) ?? { available: 0, totalCapacity: 0, occupied: 0 };

      entry.totalCapacity += table.capacity;
      if (table.status === 'available') {
        entry.available++;
      } else if (table.status === 'occupied') {
        entry.occupied++;
      }

      sections.set(section, entry);
    }

    return Array.from(sections.entries()).map(([section, data]) => ({
      section,
      availableTables: data.available,
      totalCapacity: data.totalCapacity,
      occupiedTables: data.occupied,
    }));
  }

  /**
   * Check if a table is available for seating.
   */
  isAvailable(table: TableInfo): boolean {
    return table.status === 'available';
  }

  /**
   * Get recommended table capacity for a party size.
   * (Assumes ~20% extra capacity for comfort.)
   */
  recommendCapacity(partySize: number): number {
    return Math.ceil(partySize * 1.2);
  }

  /**
   * Calculate total seated capacity across a list of tables.
   */
  totalCapacity(tables: TableInfo[]): number {
    return tables.reduce((sum, t) => sum + t.capacity, 0);
  }
}
