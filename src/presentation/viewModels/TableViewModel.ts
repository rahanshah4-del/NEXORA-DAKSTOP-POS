/**
 * TableViewModel.ts — Transforms Table domain models to UI-friendly shapes.
 */

import type { Table } from '../../types/models';

export interface TableViewData {
  id: string;
  name: string;
  section: string;
  capacity: number;
  status: string;
  statusLabel: string;
  statusColor: 'green' | 'red' | 'orange' | 'blue' | 'gray';
  positionX: number;
  positionY: number;
  currentOrderId: string;
  isAvailable: boolean;
  createdAtFormatted: string;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
};

const STATUS_COLORS: Record<string, TableViewData['statusColor']> = {
  available: 'green',
  occupied: 'red',
  reserved: 'orange',
  cleaning: 'blue',
  maintenance: 'gray',
};

export class TableViewModel {
  static toViewData(table: Table): TableViewData {
    return {
      id: table.id,
      name: table.name,
      section: table.section ?? 'Main',
      capacity: table.capacity,
      status: table.status,
      statusLabel: STATUS_LABELS[table.status] ?? table.status,
      statusColor: STATUS_COLORS[table.status] ?? 'gray',
      positionX: table.positionX ?? 0,
      positionY: table.positionY ?? 0,
      currentOrderId: table.currentOrderId ?? '',
      isAvailable: table.status === 'available',
      createdAtFormatted: new Date(table.createdAt).toLocaleDateString(),
    };
  }

  static toViewDataList(tables: Table[]): TableViewData[] {
    return tables.map((t) => this.toViewData(t));
  }
}
