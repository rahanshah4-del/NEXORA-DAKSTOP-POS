/**
 * Table Domain — Service, Validator, Policy, Factory, Events.
 * Interface only. No implementation.
 */

import type { IDomainService } from '../shared/IDomainService';
import type { IDomainValidator } from '../shared/IDomainValidator';
import type { IDomainPolicy } from '../shared/IDomainPolicy';
import type { IDomainFactory } from '../shared/IDomainFactory';
import type { Table } from '../../types/models';
import type {
  ICreateTableCommand,
  IUpdateTableCommand,
  IOpenTableCommand,
  ICloseTableCommand,
  IMergeTablesCommand,
  ITransferTableCommand,
} from '../commands/ITableCommands';
import type {
  ITableOpenedEvent,
  ITableClosedEvent,
  ITableMergedEvent,
  ITableStatusChangedEvent,
  ITableTransferredEvent,
} from '../events/IDomainEvents';

export interface ITableService extends IDomainService<Table, ICreateTableCommand, IUpdateTableCommand> {
  openTable(command: IOpenTableCommand): Promise<Table>;
  closeTable(command: ICloseTableCommand): Promise<Table>;
  mergeTables(command: IMergeTablesCommand): Promise<Table>;
  transferTable(command: ITransferTableCommand): Promise<Table>;
  getBySection(section: string): Promise<Table[]>;
  getAvailable(): Promise<Table[]>;
  getByStatus(status: string): Promise<Table[]>;
  getFloorLayout(): Promise<Table[]>;
}

export interface ITableValidator extends IDomainValidator<ICreateTableCommand, Table> {
  validateOpen(command: IOpenTableCommand, existing: Table): import('../shared/IValidationResult').IValidationResult;
  validateClose(command: ICloseTableCommand, existing: Table): import('../shared/IValidationResult').IValidationResult;
  validateMerge(source: Table, target: Table): import('../shared/IValidationResult').IValidationResult;
  validateStatusTransition(current: string, next: string): import('../shared/IValidationResult').IValidationResult;
}

export interface ITablePolicy extends IDomainPolicy<Table> {
  canBeOpened(table: Table): boolean;
  canBeClosed(table: Table): boolean;
  canBeMerged(table: Table): boolean;
  canBeTransferred(table: Table): boolean;
  requiresWaiterAssignment(): boolean;
  getMaxTablesPerSection(): number;
}

export interface ITableFactory extends IDomainFactory<Table, ICreateTableCommand> {
  createFloorLayout(tables: Partial<ICreateTableCommand>[]): Table[];
}

export interface ITableEventPublisher {
  tableOpened(event: Omit<ITableOpenedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  tableClosed(event: Omit<ITableClosedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  tableMerged(event: Omit<ITableMergedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  tableStatusChanged(event: Omit<ITableStatusChangedEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
  tableTransferred(event: Omit<ITableTransferredEvent, keyof import('../shared/IDomainEvent').IDomainEventPayload>): void;
}
