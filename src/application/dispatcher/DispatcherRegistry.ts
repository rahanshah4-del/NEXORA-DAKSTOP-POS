/**
 * DispatcherRegistry.ts — Registry mapping command/query types to handler tokens.
 *
 * The registry maps domain command/query type names (e.g., 'ICreateOrderCommand')
 * to DI tokens (e.g., 'cmd.order') so the dispatcher can resolve the right handler.
 */

import type { ICommandHandler } from '../common/ICommandHandler';
import type { IQueryHandler } from '../common/IQueryHandler';

// ── Handler Entry ──

export interface HandlerEntry {
  /** The command or query type name (e.g., 'ICreateOrderCommand'). */
  commandOrQueryType: string;

  /** The DI token for the handler class. */
  handlerToken: string;

  /** The method name on the handler to call (default: 'execute'). */
  methodName: string;

  /** Human-readable description. */
  description: string;
}

// ── Registry ──

export class DispatcherRegistry {
  private _commandMap = new Map<string, HandlerEntry>();
  private _queryMap = new Map<string, HandlerEntry>();

  // ── Registration ──

  /** Register a command → handler mapping. */
  registerCommand(entry: HandlerEntry): this {
    this._commandMap.set(entry.commandOrQueryType, entry);
    return this;
  }

  /** Register multiple command mappings at once. */
  registerCommands(entries: HandlerEntry[]): this {
    for (const entry of entries) {
      this._commandMap.set(entry.commandOrQueryType, entry);
    }
    return this;
  }

  /** Register a query → handler mapping. */
  registerQuery(entry: HandlerEntry): this {
    this._queryMap.set(entry.commandOrQueryType, entry);
    return this;
  }

  /** Register multiple query mappings at once. */
  registerQueries(entries: HandlerEntry[]): this {
    for (const entry of entries) {
      this._queryMap.set(entry.commandOrQueryType, entry);
    }
    return this;
  }

  // ── Resolution ──

  /** Resolve the handler entry for a command type. */
  resolveCommand(commandType: string): HandlerEntry | undefined {
    return this._commandMap.get(commandType);
  }

  /** Resolve the handler entry for a query type. */
  resolveQuery(queryType: string): HandlerEntry | undefined {
    return this._queryMap.get(queryType);
  }

  /** Check if a command type is registered. */
  hasCommand(commandType: string): boolean {
    return this._commandMap.has(commandType);
  }

  /** Check if a query type is registered. */
  hasQuery(queryType: string): boolean {
    return this._queryMap.has(queryType);
  }

  /** Get all registered command types. */
  get commandTypes(): string[] {
    return Array.from(this._commandMap.keys());
  }

  /** Get all registered query types. */
  get queryTypes(): string[] {
    return Array.from(this._queryMap.keys());
  }

  /** Number of registered commands. */
  get commandCount(): number {
    return this._commandMap.size;
  }

  /** Number of registered queries. */
  get queryCount(): number {
    return this._queryMap.size;
  }
}

// ── Default Command Registry ──

/**
 * Build the default command → handler mapping.
 * Maps domain command interface names to DI tokens.
 */
export function buildDefaultCommandRegistry(): DispatcherRegistry {
  const registry = new DispatcherRegistry();

  // Order commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateOrderCommand', handlerToken: 'cmd.order', methodName: 'createOrder', description: 'Create a new order' },
    { commandOrQueryType: 'IUpdateOrderCommand', handlerToken: 'cmd.order', methodName: 'updateOrder', description: 'Update an order' },
    { commandOrQueryType: 'ICancelOrderCommand', handlerToken: 'cmd.order', methodName: 'cancelOrder', description: 'Cancel an order' },
    { commandOrQueryType: 'IRefundOrderCommand', handlerToken: 'cmd.order', methodName: 'refundOrder', description: 'Refund an order' },
    { commandOrQueryType: 'ISplitBillCommand', handlerToken: 'cmd.order', methodName: 'splitBill', description: 'Split a bill' },
    { commandOrQueryType: 'IUpdateOrderStatusCommand', handlerToken: 'cmd.order', methodName: 'updateOrderStatus', description: 'Update order status' },
    { commandOrQueryType: 'IAddOrderItemCommand', handlerToken: 'cmd.order', methodName: 'addOrderItem', description: 'Add item to order' },
    { commandOrQueryType: 'IRemoveOrderItemCommand', handlerToken: 'cmd.order', methodName: 'removeOrderItem', description: 'Remove item from order' },
    { commandOrQueryType: 'IUpdatePaymentStatusCommand', handlerToken: 'cmd.order', methodName: 'updatePaymentStatus', description: 'Update payment status' },
    { commandOrQueryType: 'IMergeTableCommand', handlerToken: 'cmd.order', methodName: 'mergeTable', description: 'Merge tables' },
    { commandOrQueryType: 'IAssignWaiterCommand', handlerToken: 'cmd.order', methodName: 'assignWaiter', description: 'Assign waiter to table' },
  ]);

  // Product commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateProductCommand', handlerToken: 'cmd.product', methodName: 'createProduct', description: 'Create product' },
    { commandOrQueryType: 'IUpdateProductCommand', handlerToken: 'cmd.product', methodName: 'updateProduct', description: 'Update product' },
    { commandOrQueryType: 'IUpdateProductPriceCommand', handlerToken: 'cmd.product', methodName: 'updateProductPrice', description: 'Update product price' },
    { commandOrQueryType: 'IUpdateProductCostCommand', handlerToken: 'cmd.product', methodName: 'updateProductCost', description: 'Update product cost' },
    { commandOrQueryType: 'IActivateProductCommand', handlerToken: 'cmd.product', methodName: 'activateProduct', description: 'Activate product' },
    { commandOrQueryType: 'IDeactivateProductCommand', handlerToken: 'cmd.product', methodName: 'deactivateProduct', description: 'Deactivate product' },
    { commandOrQueryType: 'IBulkUpdatePriceCommand', handlerToken: 'cmd.product', methodName: 'bulkUpdatePrice', description: 'Bulk update prices' },
  ]);

  // Customer commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateCustomerCommand', handlerToken: 'cmd.customer', methodName: 'createCustomer', description: 'Create customer' },
    { commandOrQueryType: 'IUpdateCustomerCommand', handlerToken: 'cmd.customer', methodName: 'updateCustomer', description: 'Update customer' },
    { commandOrQueryType: 'IAddCustomerNoteCommand', handlerToken: 'cmd.customer', methodName: 'addCustomerNote', description: 'Add customer note' },
  ]);

  // Inventory commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateInventoryItemCommand', handlerToken: 'cmd.inventory', methodName: 'createInventoryItem', description: 'Create inventory item' },
    { commandOrQueryType: 'IUpdateInventoryItemCommand', handlerToken: 'cmd.inventory', methodName: 'updateInventoryItem', description: 'Update inventory item' },
    { commandOrQueryType: 'IAdjustInventoryCommand', handlerToken: 'cmd.inventory', methodName: 'adjustInventory', description: 'Adjust inventory' },
    { commandOrQueryType: 'IBulkAdjustInventoryCommand', handlerToken: 'cmd.inventory', methodName: 'bulkAdjustInventory', description: 'Bulk adjust inventory' },
    { commandOrQueryType: 'IRecordWasteCommand', handlerToken: 'cmd.inventory', methodName: 'recordWaste', description: 'Record waste' },
    { commandOrQueryType: 'IReorderCommand', handlerToken: 'cmd.inventory', methodName: 'reorder', description: 'Reorder inventory' },
  ]);

  // Payment commands
  registry.registerCommands([
    { commandOrQueryType: 'IProcessPaymentCommand', handlerToken: 'cmd.payment', methodName: 'processPayment', description: 'Process payment' },
    { commandOrQueryType: 'IRefundPaymentCommand', handlerToken: 'cmd.payment', methodName: 'refundPayment', description: 'Refund payment' },
    { commandOrQueryType: 'IVoidPaymentCommand', handlerToken: 'cmd.payment', methodName: 'voidPayment', description: 'Void payment' },
  ]);

  // Kitchen commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateKitchenTicketCommand', handlerToken: 'cmd.kitchen', methodName: 'createKitchenTicket', description: 'Create kitchen ticket' },
    { commandOrQueryType: 'IUpdateTicketItemStatusCommand', handlerToken: 'cmd.kitchen', methodName: 'updateTicketItemStatus', description: 'Update ticket item status' },
    { commandOrQueryType: 'ICompleteKitchenTicketCommand', handlerToken: 'cmd.kitchen', methodName: 'completeKitchenTicket', description: 'Complete kitchen ticket' },
    { commandOrQueryType: 'IMarkItemReadyCommand', handlerToken: 'cmd.kitchen', methodName: 'markItemReady', description: 'Mark item ready' },
    { commandOrQueryType: 'IBumpTicketCommand', handlerToken: 'cmd.kitchen', methodName: 'bumpTicket', description: 'Bump ticket' },
    { commandOrQueryType: 'IAssignKdsDisplayCommand', handlerToken: 'cmd.kitchen', methodName: 'assignKdsDisplay', description: 'Assign KDS display' },
  ]);

  // Staff commands
  registry.registerCommands([
    { commandOrQueryType: 'ICreateEmployeeCommand', handlerToken: 'cmd.staff', methodName: 'createEmployee', description: 'Create employee' },
    { commandOrQueryType: 'IUpdateEmployeeCommand', handlerToken: 'cmd.staff', methodName: 'updateEmployee', description: 'Update employee' },
    { commandOrQueryType: 'IDeactivateEmployeeCommand', handlerToken: 'cmd.staff', methodName: 'deactivateEmployee', description: 'Deactivate employee' },
    { commandOrQueryType: 'IReactivateEmployeeCommand', handlerToken: 'cmd.staff', methodName: 'reactivateEmployee', description: 'Reactivate employee' },
    { commandOrQueryType: 'IClockInCommand', handlerToken: 'cmd.staff', methodName: 'clockIn', description: 'Clock in' },
    { commandOrQueryType: 'IClockOutCommand', handlerToken: 'cmd.staff', methodName: 'clockOut', description: 'Clock out' },
    { commandOrQueryType: 'ICloseShiftCommand', handlerToken: 'cmd.staff', methodName: 'closeShift', description: 'Close shift' },
    { commandOrQueryType: 'IOpenDrawerCommand', handlerToken: 'cmd.staff', methodName: 'openDrawer', description: 'Open drawer' },
    { commandOrQueryType: 'ICloseDrawerCommand', handlerToken: 'cmd.staff', methodName: 'closeDrawer', description: 'Close drawer' },
  ]);

  // Settings commands
  registry.registerCommands([
    { commandOrQueryType: 'IUpdateSettingCommand', handlerToken: 'cmd.settings', methodName: 'updateSetting', description: 'Update setting' },
    { commandOrQueryType: 'IBulkUpdateSettingsCommand', handlerToken: 'cmd.settings', methodName: 'bulkUpdateSettings', description: 'Bulk update settings' },
    { commandOrQueryType: 'IResetSettingCommand', handlerToken: 'cmd.settings', methodName: 'resetSetting', description: 'Reset setting' },
  ]);

  // Workspace/Branch/Counter
  registry.registerCommands([
    { commandOrQueryType: 'ICreateWorkspaceCommand', handlerToken: 'cmd.workspace', methodName: 'createWorkspace', description: 'Create workspace' },
    { commandOrQueryType: 'IUpdateWorkspaceCommand', handlerToken: 'cmd.workspace', methodName: 'updateWorkspace', description: 'Update workspace' },
    { commandOrQueryType: 'ICreateBranchCommand', handlerToken: 'cmd.branch', methodName: 'createBranch', description: 'Create branch' },
    { commandOrQueryType: 'IUpdateBranchCommand', handlerToken: 'cmd.branch', methodName: 'updateBranch', description: 'Update branch' },
    { commandOrQueryType: 'ISwitchBranchCommand', handlerToken: 'cmd.branch', methodName: 'switchBranch', description: 'Switch branch' },
    { commandOrQueryType: 'IOpenCounterCommand', handlerToken: 'cmd.counter', methodName: 'openCounter', description: 'Open counter' },
    { commandOrQueryType: 'ICloseCounterCommand', handlerToken: 'cmd.counter', methodName: 'closeCounter', description: 'Close counter' },
  ]);

  return registry;
}

/**
 * Build the default query → handler mapping.
 */
export function buildDefaultQueryRegistry(): DispatcherRegistry {
  const registry = new DispatcherRegistry();

  // Order queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetOrderQuery', handlerToken: 'qry.order', methodName: 'getOrder', description: 'Get order by ID' },
    { commandOrQueryType: 'IGetOrdersByTableQuery', handlerToken: 'qry.order', methodName: 'getOrdersByTable', description: 'Get orders by table' },
    { commandOrQueryType: 'IGetOrdersByStatusQuery', handlerToken: 'qry.order', methodName: 'getOrdersByStatus', description: 'Get orders by status' },
    { commandOrQueryType: 'IGetOrdersByDateQuery', handlerToken: 'qry.order', methodName: 'getOrdersByDate', description: 'Get orders by date' },
    { commandOrQueryType: 'IGetActiveOrdersQuery', handlerToken: 'qry.order', methodName: 'getActiveOrders', description: 'Get active orders' },
    { commandOrQueryType: 'IGetOrdersByCustomerQuery', handlerToken: 'qry.order', methodName: 'getOrdersByCustomer', description: 'Get orders by customer' },
    { commandOrQueryType: 'IGetOrdersByTypeQuery', handlerToken: 'qry.order', methodName: 'getOrdersByType', description: 'Get orders by type' },
    { commandOrQueryType: 'IGetUnpaidOrdersQuery', handlerToken: 'qry.order', methodName: 'getUnpaidOrders', description: 'Get unpaid orders' },
    { commandOrQueryType: 'ISearchOrdersQuery', handlerToken: 'qry.order', methodName: 'searchOrders', description: 'Search orders' },
  ]);

  // Product/Menu queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetMenuQuery', handlerToken: 'qry.product', methodName: 'getMenu', description: 'Get menu' },
    { commandOrQueryType: 'IGetProductQuery', handlerToken: 'qry.product', methodName: 'getProduct', description: 'Get product by ID' },
    { commandOrQueryType: 'IGetProductsByCategoryQuery', handlerToken: 'qry.product', methodName: 'getProductsByCategory', description: 'Get products by category' },
    { commandOrQueryType: 'ISearchProductsQuery', handlerToken: 'qry.product', methodName: 'searchProducts', description: 'Search products' },
    { commandOrQueryType: 'IGetCategoriesQuery', handlerToken: 'qry.product', methodName: 'getCategories', description: 'Get categories' },
    { commandOrQueryType: 'IGetPopularProductsQuery', handlerToken: 'qry.product', methodName: 'getPopularProducts', description: 'Get popular products' },
  ]);

  // Customer queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetCustomerQuery', handlerToken: 'qry.customer', methodName: 'getCustomer', description: 'Get customer' },
    { commandOrQueryType: 'ISearchCustomersQuery', handlerToken: 'qry.customer', methodName: 'searchCustomers', description: 'Search customers' },
    { commandOrQueryType: 'IGetTopCustomersQuery', handlerToken: 'qry.customer', methodName: 'getTopCustomers', description: 'Get top customers' },
    { commandOrQueryType: 'IGetCustomerOrdersQuery', handlerToken: 'qry.customer', methodName: 'getCustomerOrders', description: 'Get customer orders' },
    { commandOrQueryType: 'IGetCustomerByEmailQuery', handlerToken: 'qry.customer', methodName: 'getCustomerByEmail', description: 'Get customer by email' },
    { commandOrQueryType: 'IGetCustomerByPhoneQuery', handlerToken: 'qry.customer', methodName: 'getCustomerByPhone', description: 'Get customer by phone' },
  ]);

  // Inventory queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetInventoryQuery', handlerToken: 'qry.inventory', methodName: 'getInventory', description: 'Get inventory' },
    { commandOrQueryType: 'IGetLowStockQuery', handlerToken: 'qry.inventory', methodName: 'getLowStock', description: 'Get low stock' },
    { commandOrQueryType: 'IGetOutOfStockQuery', handlerToken: 'qry.inventory', methodName: 'getOutOfStock', description: 'Get out of stock' },
    { commandOrQueryType: 'ISearchInventoryQuery', handlerToken: 'qry.inventory', methodName: 'searchInventory', description: 'Search inventory' },
    { commandOrQueryType: 'IGetInventoryTransactionsQuery', handlerToken: 'qry.inventory', methodName: 'getInventoryTransactions', description: 'Get inventory transactions' },
    { commandOrQueryType: 'IGetInventoryValueQuery', handlerToken: 'qry.inventory', methodName: 'getInventoryValue', description: 'Get inventory value' },
  ]);

  // Kitchen queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetKitchenQueueQuery', handlerToken: 'qry.kitchen', methodName: 'getKitchenQueue', description: 'Get kitchen queue' },
    { commandOrQueryType: 'IGetKitchenTicketQuery', handlerToken: 'qry.kitchen', methodName: 'getKitchenTicket', description: 'Get kitchen ticket' },
    { commandOrQueryType: 'IGetActiveTicketsQuery', handlerToken: 'qry.kitchen', methodName: 'getActiveTickets', description: 'Get active tickets' },
    { commandOrQueryType: 'IGetTicketItemsQuery', handlerToken: 'qry.kitchen', methodName: 'getTicketItems', description: 'Get ticket items' },
    { commandOrQueryType: 'IGetCompletedTicketsQuery', handlerToken: 'qry.kitchen', methodName: 'getCompletedTickets', description: 'Get completed tickets' },
    { commandOrQueryType: 'IGetKdsConfigQuery', handlerToken: 'qry.kitchen', methodName: 'getKdsConfig', description: 'Get KDS config' },
  ]);

  // Report queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetSalesReportQuery', handlerToken: 'qry.report', methodName: 'getSalesReport', description: 'Get sales report' },
    { commandOrQueryType: 'IGetRevenueSummaryQuery', handlerToken: 'qry.report', methodName: 'getRevenueSummary', description: 'Get revenue summary' },
    { commandOrQueryType: 'IGetTopSellingProductsQuery', handlerToken: 'qry.report', methodName: 'getTopSellingProducts', description: 'Get top selling products' },
    { commandOrQueryType: 'IGetPaymentMethodBreakdownQuery', handlerToken: 'qry.report', methodName: 'getPaymentMethodBreakdown', description: 'Get payment method breakdown' },
    { commandOrQueryType: 'IGetEmployeePerformanceQuery', handlerToken: 'qry.report', methodName: 'getEmployeePerformance', description: 'Get employee performance' },
    { commandOrQueryType: 'IGetTableTurnoverQuery', handlerToken: 'qry.report', methodName: 'getTableTurnover', description: 'Get table turnover' },
    { commandOrQueryType: 'IGetDailySummaryQuery', handlerToken: 'qry.report', methodName: 'getDailySummary', description: 'Get daily summary' },
    { commandOrQueryType: 'IGetDashboardStatsQuery', handlerToken: 'qry.report', methodName: 'getDashboardStats', description: 'Get dashboard stats' },
  ]);

  // Settings queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetSettingsQuery', handlerToken: 'qry.settings', methodName: 'getSettings', description: 'Get settings' },
    { commandOrQueryType: 'IGetSettingQuery', handlerToken: 'qry.settings', methodName: 'getSetting', description: 'Get setting by key' },
  ]);

  // Misc queries
  registry.registerQueries([
    { commandOrQueryType: 'IGetStaffQuery', handlerToken: 'qry.misc', methodName: 'getStaff', description: 'Get staff' },
    { commandOrQueryType: 'IGetActiveShiftsQuery', handlerToken: 'qry.misc', methodName: 'getActiveShifts', description: 'Get active shifts' },
    { commandOrQueryType: 'IGetShiftHistoryQuery', handlerToken: 'qry.misc', methodName: 'getShiftHistory', description: 'Get shift history' },
    { commandOrQueryType: 'IGetTablesQuery', handlerToken: 'qry.misc', methodName: 'getTables', description: 'Get tables' },
    { commandOrQueryType: 'IGetTableLayoutQuery', handlerToken: 'qry.misc', methodName: 'getTableLayout', description: 'Get table layout' },
    { commandOrQueryType: 'IGetPaymentsQuery', handlerToken: 'qry.misc', methodName: 'getPayments', description: 'Get payments' },
    { commandOrQueryType: 'IGetPaymentSummaryQuery', handlerToken: 'qry.misc', methodName: 'getPaymentSummary', description: 'Get payment summary' },
    { commandOrQueryType: 'IGetCurrentUserQuery', handlerToken: 'qry.misc', methodName: 'getCurrentUser', description: 'Get current user' },
    { commandOrQueryType: 'IGetSyncStatusQuery', handlerToken: 'qry.misc', methodName: 'getSyncStatus', description: 'Get sync status' },
    { commandOrQueryType: 'IGetActiveCounterQuery', handlerToken: 'qry.misc', methodName: 'getActiveCounter', description: 'Get active counter' },
  ]);

  return registry;
}
