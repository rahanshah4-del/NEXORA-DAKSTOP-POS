/**
 * CustomerService — Restaurant customer management logic.
 *
 * Orchestrates: CustomerRepository
 * Uses engines: LoyaltyCalculator
 */

import type { Customer } from '../../../types/models';
import type { ICustomerRepository } from '../../../repositories/ICustomerRepository';
import { LoyaltyCalculator, type LoyaltyTier } from './engines/loyalty-calculator';
import type { ServiceResult } from './order-service';

function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data, error: null, validationErrors: [] };
}

function fail<T>(error: string, validationErrors: string[] = []): ServiceResult<T> {
  return { success: false, data: null, error, validationErrors };
}

// ── Types ──

export interface CreateCustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  customerId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface CustomerWithLoyalty extends Customer {
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
}

// ── Service ──

export class CustomerService {
  private readonly loyaltyCalc = new LoyaltyCalculator();

  constructor(private customerRepo: ICustomerRepository) {}

  // ── CRUD ──

  async createCustomer(input: CreateCustomerInput): Promise<ServiceResult<Customer>> {
    const errors: string[] = [];
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Customer name is required');
    }

    // Uniqueness checks
    if (input.email) {
      const existing = await this.customerRepo.findByEmail(input.email);
      if (existing) errors.push(`Customer with email '${input.email}' already exists`);
    }
    if (input.phone) {
      const existing = await this.customerRepo.findByPhone(input.phone);
      if (existing) errors.push(`Customer with phone '${input.phone}' already exists`);
    }

    if (errors.length > 0) return fail('Validation failed', errors);

    const customer = await this.customerRepo.create({
      name: input.name.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      notes: input.notes ?? null,
    } as Partial<Customer>);

    return ok(customer);
  }

  async updateCustomer(input: UpdateCustomerInput): Promise<ServiceResult<Customer>> {
    const existing = await this.customerRepo.findById(input.customerId);
    if (!existing) return fail(`Customer not found: ${input.customerId}`);

    const updates: Partial<Customer> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.address !== undefined) updates.address = input.address;
    if (input.notes !== undefined) updates.notes = input.notes;

    // Email uniqueness
    if (input.email && input.email !== existing.email) {
      const duplicate = await this.customerRepo.findByEmail(input.email);
      if (duplicate) return fail(`Customer with email '${input.email}' already exists`);
    }

    const customer = await this.customerRepo.update(input.customerId, updates);
    return ok(customer);
  }

  async deleteCustomer(customerId: string): Promise<ServiceResult<void>> {
    const existing = await this.customerRepo.findById(customerId);
    if (!existing) return fail(`Customer not found: ${customerId}`);
    await this.customerRepo.delete(customerId);
    return ok(undefined);
  }

  /**
   * Update customer stats after an order.
   */
  async updateOrderStats(
    customerId: string,
    orderTotalCents: number,
  ): Promise<ServiceResult<void>> {
    await this.customerRepo.updateStats(customerId, orderTotalCents);
    return ok(undefined);
  }

  // ── Queries ──

  async searchCustomers(query: string): Promise<Customer[]> {
    return this.customerRepo.search(query);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepo.findByEmail(email);
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerRepo.findByPhone(phone);
  }

  async getTopBySpending(limit: number = 10): Promise<Customer[]> {
    return this.customerRepo.findTopBySpent(limit);
  }

  async getTopByOrders(limit: number = 10): Promise<Customer[]> {
    return this.customerRepo.findTopByOrders(limit);
  }

  // ── Loyalty ──

  /**
   * Get a customer with their loyalty tier and points.
   * Points are calculated from totalSpentCents: 1 point per dollar spent.
   */
  async getWithLoyalty(customerId: string): Promise<ServiceResult<CustomerWithLoyalty>> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return fail(`Customer not found: ${customerId}`);

    const tier = this.loyaltyCalc.determineTier(
      customer.totalOrders,
      customer.totalSpentCents,
    );
    const dollars = Math.floor(customer.totalSpentCents / 100);
    const points = dollars; // 1 point per dollar

    return ok({
      ...customer,
      loyaltyTier: tier,
      loyaltyPoints: points,
    });
  }

  /**
   * Calculate loyalty points that would be earned for a given spend.
   */
  calculatePotentialPoints(
    orderTotalCents: number,
    totalOrders: number,
    totalSpentCents: number,
  ) {
    const tier = this.loyaltyCalc.determineTier(totalOrders, totalSpentCents);
    return this.loyaltyCalc.calculateEarnings(orderTotalCents, tier);
  }
}
