/**
 * Table Command Interfaces.
 * CQRS commands for the Table aggregate.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';
import type { TableStatus } from '../../types/enums';

export interface ICreateTableCommand extends ICommand {
  name: string;
  section: string | null;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
}

export interface IUpdateTableCommand extends ICommand {
  tableId: string;
  name?: string;
  section?: string | null;
  capacity?: number;
  positionX?: number | null;
  positionY?: number | null;
}

export interface IUpdateTableStatusCommand extends ICommand {
  tableId: string;
  status: TableStatus;
}

export interface IOpenTableCommand extends ICommand {
  tableId: string;
  customerId: string | null;
  waiterId: string | null;
}

export interface ICloseTableCommand extends ICommand {
  tableId: string;
}

export interface IMergeTablesCommand extends ICommand {
  sourceTableId: string;
  targetTableId: string;
}

export interface ISplitTableCommand extends ICommand {
  tableId: string;
  newTableName: string;
  itemIds: string[];
}

export interface ITransferTableCommand extends ICommand {
  tableId: string;
  newSection: string;
  newPositionX: number | null;
  newPositionY: number | null;
}
