/**
 * CustomerViewModel.ts — Transforms Customer domain models to UI-friendly shapes.
 */

import type { Customer } from '../../types/models';

export interface CustomerViewData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: string;
  notes: string;
  createdAtFormatted: string;
  initials: string;
}

export class CustomerViewModel {
  static centsToDollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  static formatDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  }

  static toViewData(customer: Customer): CustomerViewData {
    const nameParts = customer.name.trim().split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : (customer.name[0] ?? '?').toUpperCase();

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email ?? '—',
      phone: customer.phone ?? '—',
      address: customer.address ?? '—',
      totalOrders: customer.totalOrders,
      totalSpent: this.centsToDollars(customer.totalSpentCents),
      notes: customer.notes ?? '',
      createdAtFormatted: this.formatDate(customer.createdAt),
      initials,
    };
  }

  static toViewDataList(customers: Customer[]): CustomerViewData[] {
    return customers.map((c) => this.toViewData(c));
  }
}
