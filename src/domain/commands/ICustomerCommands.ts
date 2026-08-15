/**
 * Customer Command Interfaces.
 * CQRS commands for the Customer aggregate.
 * Interface only. No implementation.
 */

import type { ICommand } from '../shared/ICommand';

export interface ICreateCustomerCommand extends ICommand {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

export interface IUpdateCustomerCommand extends ICommand {
  customerId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface IAddCustomerNoteCommand extends ICommand {
  customerId: string;
  note: string;
}
