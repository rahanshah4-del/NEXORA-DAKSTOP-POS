/**
 * Domain Event Interfaces.
 *
 * All domain events that can be raised by the system.
 * Events are immutable facts — they represent something
 * that has already happened.
 *
 * Interface only. No implementation.
 */

import type { IDomainEventPayload } from '../shared/IDomainEvent';
import type { EntityType } from '../../sync/SyncTypes';
import type { OrderStatus, PaymentStatus, PaymentMethod, TableStatus, UserRole, InventoryTransactionType } from '../../types/enums';

// ═══════════════════════════════════════════════════════════
// ORDER EVENTS
// ═══════════════════════════════════════════════════════════

export interface IOrderCreatedEvent extends IDomainEventPayload {
  eventType: 'order.created';
  entityType: 'order';
  data: {
    orderNumber: number;
    tableId: string | null;
    tableName: string | null;
    customerId: string | null;
    customerName: string | null;
    orderType: string;
    itemCount: number;
    totalCents: number;
  };
}

export interface IOrderUpdatedEvent extends IDomainEventPayload {
  eventType: 'order.updated';
  entityType: 'order';
  data: {
    changes: Record<string, unknown>;
  };
}

export interface IOrderPaidEvent extends IDomainEventPayload {
  eventType: 'order.paid';
  entityType: 'order';
  data: {
    amountCents: number;
    paymentMethod: PaymentMethod;
    previousPaymentStatus: PaymentStatus;
  };
}

export interface IOrderCancelledEvent extends IDomainEventPayload {
  eventType: 'order.cancelled';
  entityType: 'order';
  data: {
    reason: string;
    wasRefunded: boolean;
    refundAmountCents: number | null;
  };
}

export interface IOrderRefundedEvent extends IDomainEventPayload {
  eventType: 'order.refunded';
  entityType: 'order';
  data: {
    refundAmountCents: number;
    reason: string;
    method: PaymentMethod;
  };
}

export interface IOrderStatusChangedEvent extends IDomainEventPayload {
  eventType: 'order.status_changed';
  entityType: 'order';
  data: {
    previousStatus: OrderStatus;
    currentStatus: OrderStatus;
  };
}

export interface IOrderItemAddedEvent extends IDomainEventPayload {
  eventType: 'order.item_added';
  entityType: 'order';
  data: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
  };
}

export interface IOrderItemRemovedEvent extends IDomainEventPayload {
  eventType: 'order.item_removed';
  entityType: 'order';
  data: {
    itemId: string;
    productName: string;
  };
}

export interface IBillSplitEvent extends IDomainEventPayload {
  eventType: 'order.bill_split';
  entityType: 'order';
  data: {
    originalOrderId: string;
    newOrderIds: string[];
    splitCount: number;
  };
}

// ═══════════════════════════════════════════════════════════
// TABLE EVENTS
// ═══════════════════════════════════════════════════════════

export interface ITableOpenedEvent extends IDomainEventPayload {
  eventType: 'table.opened';
  entityType: 'table';
  data: {
    tableName: string;
    customerId: string | null;
    waiterId: string | null;
    orderId: string;
  };
}

export interface ITableClosedEvent extends IDomainEventPayload {
  eventType: 'table.closed';
  entityType: 'table';
  data: {
    tableName: string;
    orderId: string;
    totalCents: number;
  };
}

export interface ITableMergedEvent extends IDomainEventPayload {
  eventType: 'table.merged';
  entityType: 'table';
  data: {
    sourceTableId: string;
    sourceTableName: string;
    targetTableId: string;
    targetTableName: string;
  };
}

export interface ITableStatusChangedEvent extends IDomainEventPayload {
  eventType: 'table.status_changed';
  entityType: 'table';
  data: {
    previousStatus: TableStatus;
    currentStatus: TableStatus;
  };
}

export interface ITableTransferredEvent extends IDomainEventPayload {
  eventType: 'table.transferred';
  entityType: 'table';
  data: {
    previousSection: string;
    newSection: string;
  };
}

// ═══════════════════════════════════════════════════════════
// KITCHEN EVENTS
// ═══════════════════════════════════════════════════════════

export interface IKitchenTicketCreatedEvent extends IDomainEventPayload {
  eventType: 'kitchen.ticket_created';
  entityType: 'kitchen';
  data: {
    ticketId: string;
    orderId: string;
    orderNumber: number;
    tableName: string | null;
    priority: string;
    itemCount: number;
  };
}

export interface IKitchenItemReadyEvent extends IDomainEventPayload {
  eventType: 'kitchen.item_ready';
  entityType: 'kitchen';
  data: {
    ticketId: string;
    itemId: string;
    itemName: string;
    orderId: string;
  };
}

export interface IKitchenTicketCompletedEvent extends IDomainEventPayload {
  eventType: 'kitchen.ticket_completed';
  entityType: 'kitchen';
  data: {
    ticketId: string;
    orderId: string;
    orderNumber: number;
    durationSeconds: number;
  };
}

// ═══════════════════════════════════════════════════════════
// CUSTOMER EVENTS
// ═══════════════════════════════════════════════════════════

export interface ICustomerCreatedEvent extends IDomainEventPayload {
  eventType: 'customer.created';
  entityType: 'customer';
  data: {
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface ICustomerUpdatedEvent extends IDomainEventPayload {
  eventType: 'customer.updated';
  entityType: 'customer';
  data: {
    changes: Record<string, unknown>;
  };
}

// ═══════════════════════════════════════════════════════════
// PRODUCT EVENTS
// ═══════════════════════════════════════════════════════════

export interface IProductCreatedEvent extends IDomainEventPayload {
  eventType: 'product.created';
  entityType: 'product';
  data: {
    name: string;
    sku: string | null;
    priceCents: number;
    categoryId: string | null;
  };
}

export interface IProductPriceChangedEvent extends IDomainEventPayload {
  eventType: 'product.price_changed';
  entityType: 'product';
  data: {
    previousPriceCents: number;
    currentPriceCents: number;
  };
}

export interface IProductDeactivatedEvent extends IDomainEventPayload {
  eventType: 'product.deactivated';
  entityType: 'product';
  data: {
    reason: string | null;
  };
}

// ═══════════════════════════════════════════════════════════
// INVENTORY EVENTS
// ═══════════════════════════════════════════════════════════

export interface IInventoryAdjustedEvent extends IDomainEventPayload {
  eventType: 'inventory.adjusted';
  entityType: 'inventory';
  data: {
    itemName: string;
    type: InventoryTransactionType;
    previousQuantity: number;
    newQuantity: number;
    deltaQuantity: number;
    notes: string | null;
  };
}

export interface ILowStockAlertEvent extends IDomainEventPayload {
  eventType: 'inventory.low_stock';
  entityType: 'inventory';
  data: {
    itemName: string;
    quantityOnHand: number;
    reorderPoint: number;
    reorderQuantity: number;
  };
}

export interface IStockDepletedEvent extends IDomainEventPayload {
  eventType: 'inventory.stock_depleted';
  entityType: 'inventory';
  data: {
    itemName: string;
  };
}

// ═══════════════════════════════════════════════════════════
// STAFF / SHIFT EVENTS
// ═══════════════════════════════════════════════════════════

export interface IShiftStartedEvent extends IDomainEventPayload {
  eventType: 'shift.started';
  entityType: 'staff';
  data: {
    employeeId: string;
    employeeName: string;
    clockInTime: string;
  };
}

export interface IShiftClosedEvent extends IDomainEventPayload {
  eventType: 'shift.closed';
  entityType: 'staff';
  data: {
    employeeId: string;
    employeeName: string;
    clockOutTime: string;
    totalMinutes: number;
    cashCountCents: number | null;
  };
}

export interface IEmployeeCreatedEvent extends IDomainEventPayload {
  eventType: 'staff.employee_created';
  entityType: 'staff';
  data: {
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export interface IEmployeeDeactivatedEvent extends IDomainEventPayload {
  eventType: 'staff.employee_deactivated';
  entityType: 'staff';
  data: {
    reason: string;
  };
}

export interface IDrawerOpenedEvent extends IDomainEventPayload {
  eventType: 'counter.drawer_opened';
  entityType: 'staff';
  data: {
    employeeId: string;
    reason: string;
  };
}

export interface IDrawerClosedEvent extends IDomainEventPayload {
  eventType: 'counter.drawer_closed';
  entityType: 'staff';
  data: {
    employeeId: string;
    cashCountCents: number;
  };
}

// ═══════════════════════════════════════════════════════════
// PAYMENT EVENTS
// ═══════════════════════════════════════════════════════════

export interface IPaymentProcessedEvent extends IDomainEventPayload {
  eventType: 'payment.processed';
  entityType: 'payment';
  data: {
    orderId: string;
    amountCents: number;
    method: PaymentMethod;
    reference: string | null;
  };
}

export interface IPaymentRefundedEvent extends IDomainEventPayload {
  eventType: 'payment.refunded';
  entityType: 'payment';
  data: {
    paymentId: string;
    orderId: string;
    amountCents: number;
    reason: string;
  };
}

export interface IPaymentVoidedEvent extends IDomainEventPayload {
  eventType: 'payment.voided';
  entityType: 'payment';
  data: {
    paymentId: string;
    orderId: string;
    reason: string;
  };
}

// ═══════════════════════════════════════════════════════════
// RESERVATION EVENTS
// ═══════════════════════════════════════════════════════════

export interface IReservationCreatedEvent extends IDomainEventPayload {
  eventType: 'reservation.created';
  entityType: 'settings';
  data: {
    customerName: string;
    partySize: number;
    reservationTime: string;
    tableId: string | null;
  };
}

export interface IReservationSeatedEvent extends IDomainEventPayload {
  eventType: 'reservation.seated';
  entityType: 'settings';
  data: {
    reservationId: string;
    tableId: string;
    tableName: string;
    orderId: string;
  };
}

// ═══════════════════════════════════════════════════════════
// LOYALTY EVENTS
// ═══════════════════════════════════════════════════════════

export interface ILoyaltyEnrolledEvent extends IDomainEventPayload {
  eventType: 'loyalty.enrolled';
  entityType: 'customer';
  data: {
    customerId: string;
    programId: string;
  };
}

export interface ILoyaltyPointsRedeemedEvent extends IDomainEventPayload {
  eventType: 'loyalty.points_redeemed';
  entityType: 'customer';
  data: {
    customerId: string;
    pointsRedeemed: number;
    orderId: string;
    discountCents: number;
  };
}

// ═══════════════════════════════════════════════════════════
// DELIVERY EVENTS
// ═══════════════════════════════════════════════════════════

export interface IDeliveryCreatedEvent extends IDomainEventPayload {
  eventType: 'delivery.created';
  entityType: 'order';
  data: {
    orderId: string;
    address: string;
    estimatedMinutes: number;
  };
}

export interface IDeliveryStatusChangedEvent extends IDomainEventPayload {
  eventType: 'delivery.status_changed';
  entityType: 'order';
  data: {
    deliveryId: string;
    previousStatus: string;
    currentStatus: string;
  };
}

// ═══════════════════════════════════════════════════════════
// BACKUP EVENTS
// ═══════════════════════════════════════════════════════════

export interface IBackupCreatedEvent extends IDomainEventPayload {
  eventType: 'backup.created';
  entityType: 'settings';
  data: {
    backupId: string;
    type: string;
    sizeBytes: number;
    entityCount: number;
  };
}

export interface IBackupRestoredEvent extends IDomainEventPayload {
  eventType: 'backup.restored';
  entityType: 'settings';
  data: {
    backupId: string;
    entityCount: number;
    durationMs: number;
  };
}

// ═══════════════════════════════════════════════════════════
// SYNC EVENTS
// ═══════════════════════════════════════════════════════════

export interface ISyncStartedEvent extends IDomainEventPayload {
  eventType: 'sync.started';
  entityType: 'settings';
  data: {
    sessionId: string;
    sessionType: string;
    triggeredBy: string;
  };
}

export interface ISyncCompletedEvent extends IDomainEventPayload {
  eventType: 'sync.completed';
  entityType: 'settings';
  data: {
    sessionId: string;
    pushed: number;
    pulled: number;
    conflicts: number;
    durationMs: number;
  };
}

export interface ISyncFailedEvent extends IDomainEventPayload {
  eventType: 'sync.failed';
  entityType: 'settings';
  data: {
    sessionId: string;
    error: string;
    durationMs: number;
  };
}

export interface IConflictDetectedEvent extends IDomainEventPayload {
  eventType: 'sync.conflict_detected';
  entityType: 'settings';
  data: {
    conflictId: string;
    conflictEntityType: string;
    conflictEntityId: string;
    sessionId: string;
  };
}

export interface IConflictResolvedEvent extends IDomainEventPayload {
  eventType: 'sync.conflict_resolved';
  entityType: 'settings';
  data: {
    conflictId: string;
    resolution: string;
    resolvedBy: string;
  };
}

// ═══════════════════════════════════════════════════════════
// AUTH EVENTS
// ═══════════════════════════════════════════════════════════

export interface IUserLoggedInEvent extends IDomainEventPayload {
  eventType: 'auth.logged_in';
  entityType: 'staff';
  data: {
    userId: string;
    email: string;
    deviceId: string;
  };
}

export interface IUserLoggedOutEvent extends IDomainEventPayload {
  eventType: 'auth.logged_out';
  entityType: 'staff';
  data: {
    userId: string;
    reason: string | null;
  };
}

// ═══════════════════════════════════════════════════════════
// WORKSPACE / BRANCH EVENTS
// ═══════════════════════════════════════════════════════════

export interface IWorkspaceCreatedEvent extends IDomainEventPayload {
  eventType: 'workspace.created';
  entityType: 'settings';
  data: {
    name: string;
    plan: string;
  };
}

export interface IBranchCreatedEvent extends IDomainEventPayload {
  eventType: 'branch.created';
  entityType: 'settings';
  data: {
    workspaceId: string;
    name: string;
    code: string;
  };
}

export interface IBranchSwitchedEvent extends IDomainEventPayload {
  eventType: 'branch.switched';
  entityType: 'settings';
  data: {
    previousBranchId: string;
    currentBranchId: string;
  };
}

// ═══════════════════════════════════════════════════════════
// SETTINGS EVENTS
// ═══════════════════════════════════════════════════════════

export interface ISettingChangedEvent extends IDomainEventPayload {
  eventType: 'settings.changed';
  entityType: 'settings';
  data: {
    key: string;
    previousValue: string | null;
    currentValue: string;
  };
}
