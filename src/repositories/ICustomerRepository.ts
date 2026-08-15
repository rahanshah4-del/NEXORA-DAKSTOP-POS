/**
 * ICustomerRepository — repository interface for Customers.
 * Interface only. No implementation.
 */

import type { Customer } from '../types/models';
import type { ISyncRepository } from './IRepository';
import type { QueryOptions } from '../services/db-service';

// ── Customer Repository Interface ──

export interface ICustomerRepository extends ISyncRepository<Customer> {
  /** Search customers by name, email, or phone */
  search(query: string, opts?: QueryOptions): Promise<Customer[]>;

  /** Find customer by email */
  findByEmail(email: string): Promise<Customer | null>;

  /** Find customer by phone */
  findByPhone(phone: string): Promise<Customer | null>;

  /** Find top customers by total spent */
  findTopBySpent(limit?: number): Promise<Customer[]>;

  /** Find top customers by order count */
  findTopByOrders(limit?: number): Promise<Customer[]>;

  /** Update customer statistics (total orders, total spent) */
  updateStats(id: string, orderTotalCents: number): Promise<void>;
}
