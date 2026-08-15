/**
 * CustomerCommandHandlers.ts — Command handlers for Customer-related commands.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { ICustomerRepository } from '../../repositories/ICustomerRepository';
import type { DomainEventDispatcher } from '../services/DomainEventDispatcher';
import type { ILogger } from '../common/IApplicationService';
import type { Customer } from '../../types/models';

export class CustomerCommandHandlers {
  constructor(
    private _customerRepo: ICustomerRepository,
    private _events: DomainEventDispatcher,
    private _logger: ILogger,
  ) {}

  async createCustomer(command: any, ctx: IApplicationContext): Promise<Result<Customer>> {
    // Check uniqueness
    if (command.email) {
      const existing = await this._customerRepo.findByEmail(command.email);
      if (existing) return Result.conflict(`Customer with email '${command.email}' already exists`);
    }
    if (command.phone) {
      const existing = await this._customerRepo.findByPhone(command.phone);
      if (existing) return Result.conflict(`Customer with phone '${command.phone}' already exists`);
    }

    const customer = await this._customerRepo.create({
      name: command.name,
      email: command.email ?? null,
      phone: command.phone ?? null,
      address: command.address ?? null,
      notes: command.notes ?? null,
    } as Partial<Customer>);

    this._events.publish('customer.created', { customerId: customer.id });
    this._logger.info(`Customer created: ${customer.name}`, { customerId: customer.id });
    return Result.ok(customer);
  }

  async updateCustomer(command: any, ctx: IApplicationContext): Promise<Result<Customer>> {
    const existing = await this._customerRepo.findById(command.customerId);
    if (!existing) return Result.notFound('Customer', command.customerId);

    const updates: Partial<Customer> = {};
    if (command.name !== undefined) updates.name = command.name;
    if (command.email !== undefined) updates.email = command.email;
    if (command.phone !== undefined) updates.phone = command.phone;
    if (command.address !== undefined) updates.address = command.address;
    if (command.notes !== undefined) updates.notes = command.notes;

    const customer = await this._customerRepo.update(command.customerId, updates);
    this._events.publish('customer.updated', { customerId: command.customerId });
    return Result.ok(customer);
  }

  async addCustomerNote(command: any, ctx: IApplicationContext): Promise<Result<Customer>> {
    const existing = await this._customerRepo.findById(command.customerId);
    if (!existing) return Result.notFound('Customer', command.customerId);

    const newNotes = existing.notes
      ? `${existing.notes}\n${command.note}`
      : command.note;

    const customer = await this._customerRepo.update(command.customerId, { notes: newNotes } as Partial<Customer>);
    return Result.ok(customer);
  }
}
