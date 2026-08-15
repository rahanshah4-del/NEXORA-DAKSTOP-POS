/**
 * Order Command Interfaces.
 * CQRS commands for the Order aggregate.
 * Interface only. No implementation.
 */

import type { ICommand, ICommandResult } from '../shared/ICommand';
import type { Order, OrderItem } from '../../types/models';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../../types/enums';

export interface ICreateOrderCommand extends ICommand {
  tableId: string | null;
  customerId: string | null;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'online';
  items: ICreateOrderItemCommand[];
  notes: string | null;
}

export interface ICreateOrderItemCommand {
  productId: string;
  quantity: number;
  notes: string | null;
}

export interface IUpdateOrderCommand extends ICommand {
  orderId: string;
  items?: IUpdateOrderItemCommand[];
  notes?: string | null;
  customerId?: string | null;
}

export interface IUpdateOrderItemCommand {
  itemId?: string;
  productId: string;
  quantity: number;
  notes: string | null;
}

export interface ICancelOrderCommand extends ICommand {
  orderId: string;
  reason: string;
}

export interface IRefundOrderCommand extends ICommand {
  orderId: string;
  amountCents: number;
  reason: string;
  method: PaymentMethod;
}

export interface IMergeTableCommand extends ICommand {
  sourceTableId: string;
  targetTableId: string;
}

export interface ISplitBillCommand extends ICommand {
  orderId: string;
  splits: ISplitBillItem[];
}

export interface ISplitBillItem {
  items: string[];
  customerId: string | null;
  notes: string | null;
}

export interface IAssignWaiterCommand extends ICommand {
  tableId: string;
  waiterId: string;
}

export interface IUpdateOrderStatusCommand extends ICommand {
  orderId: string;
  status: OrderStatus;
}

export interface IAddOrderItemCommand extends ICommand {
  orderId: string;
  productId: string;
  quantity: number;
  notes: string | null;
}

export interface IRemoveOrderItemCommand extends ICommand {
  orderId: string;
  itemId: string;
}

export interface IUpdatePaymentStatusCommand extends ICommand {
  orderId: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
}
