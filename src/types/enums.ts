export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Preparing = 'preparing',
  Ready = 'ready',
  Served = 'served',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum PaymentStatus {
  Unpaid = 'unpaid',
  Partial = 'partial',
  Paid = 'paid',
  Refunded = 'refunded',
}

export enum PaymentMethod {
  Cash = 'cash',
  Card = 'card',
  UPI = 'upi',
  Wallet = 'wallet',
  Credit = 'credit',
}

export enum OrderType {
  DineIn = 'dine_in',
  Takeaway = 'takeaway',
  Delivery = 'delivery',
  Online = 'online',
}

export enum TableStatus {
  Available = 'available',
  Occupied = 'occupied',
  Reserved = 'reserved',
  Cleaning = 'cleaning',
  Maintenance = 'maintenance',
}

export enum UserRole {
  Admin = 'admin',
  Manager = 'manager',
  Chef = 'chef',
  Waiter = 'waiter',
  Cashier = 'cashier',
  Staff = 'staff',
}

export enum InventoryTransactionType {
  Purchase = 'purchase',
  Consumption = 'consumption',
  Adjustment = 'adjustment',
  Waste = 'waste',
  Transfer = 'transfer',
}

export enum SyncStatus {
  Pending = 'pending',
  Syncing = 'syncing',
  Synced = 'synced',
  Conflict = 'conflict',
  Failed = 'failed',
}
