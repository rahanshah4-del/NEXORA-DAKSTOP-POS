import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
  TableStatus,
  UserRole,
  InventoryTransactionType,
  SyncStatus,
} from './enums';

// --- Core Domain Models ---

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  hourlyRateCents: number | null;
  isActive: boolean;
  hireDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string | null;
  priceCents: number;
  costCents: number;
  taxRateBps: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpentCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: string;
  name: string;
  section: string | null;
  capacity: number;
  status: TableStatus;
  positionX: number | null;
  positionY: number | null;
  currentOrderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  tableId: string | null;
  tableName: string | null;
  customerId: string | null;
  customerName: string | null;
  orderType: OrderType;
  status: OrderStatus;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  cancelReason: string | null;
  items: OrderItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string | null;
  productName: string | null;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  supplierId: string | null;
  lastRestockAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  itemName: string | null;
  type: InventoryTransactionType;
  quantity: number;
  referenceId: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string | null;
  clockIn: string;
  clockOut: string | null;
  totalMinutes: number | null;
  notes: string | null;
  createdAt: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: number;
  tableName: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string;
  status: SyncStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
}

// --- UI Types ---

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  children?: NavItem[];
}

export interface StatsCardData {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface RightPanelContent {
  type: 'order' | 'product' | 'customer' | 'table' | 'employee';
  title: string;
  data: Record<string, unknown>;
}
