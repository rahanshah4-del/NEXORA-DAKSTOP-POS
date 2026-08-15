/**
 * Queries — barrel export.
 * All CQRS query interfaces.
 */

export type {
  IGetOrderQuery,
  IGetOrdersByTableQuery,
  IGetOrdersByStatusQuery,
  IGetOrdersByDateQuery,
  IGetActiveOrdersQuery,
  IGetOrdersByCustomerQuery,
  IGetOrdersByTypeQuery,
  IGetUnpaidOrdersQuery,
  ISearchOrdersQuery,
} from './IOrderQueries';

export type {
  IGetMenuQuery,
  IGetProductQuery,
  IGetProductsByCategoryQuery,
  ISearchProductsQuery,
  IGetCategoriesQuery,
  IGetPopularProductsQuery,
} from './IMenuQueries';

export type {
  IGetCustomerQuery,
  ISearchCustomersQuery,
  IGetTopCustomersQuery,
  IGetCustomerOrdersQuery,
  IGetCustomerByEmailQuery,
  IGetCustomerByPhoneQuery,
} from './ICustomerQueries';

export type {
  IGetInventoryQuery,
  IGetLowStockQuery,
  IGetOutOfStockQuery,
  ISearchInventoryQuery,
  IGetInventoryTransactionsQuery,
  IGetInventoryValueQuery,
} from './IInventoryQueries';

export type {
  IGetKitchenQueueQuery,
  IGetKitchenTicketQuery,
  IGetActiveTicketsQuery,
  IGetTicketItemsQuery,
  IGetCompletedTicketsQuery,
  IGetKdsConfigQuery,
} from './IKitchenQueries';

export type {
  IGetSalesReportQuery,
  IGetRevenueSummaryQuery,
  IGetTopSellingProductsQuery,
  IGetPaymentMethodBreakdownQuery,
  IGetEmployeePerformanceQuery,
  IGetTableTurnoverQuery,
  IGetDailySummaryQuery,
  IGetTaxReportQuery,
  IGetInventoryReportQuery,
  IGetStaffHoursReportQuery,
  IGetLoyaltyReportQuery,
  IGetDeliveryReportQuery,
  IGetDashboardStatsQuery,
} from './IReportQueries';

export type {
  IGetStaffQuery,
  IGetActiveShiftsQuery,
  IGetShiftHistoryQuery,
  IGetTablesQuery,
  IGetTableLayoutQuery,
  IGetReservationsQuery,
  IGetUpcomingReservationsQuery,
  IGetLoyaltyPointsQuery,
  IGetLoyaltyHistoryQuery,
  IGetDeliveriesQuery,
  IGetActiveDeliveriesQuery,
  IGetPrintersQuery,
  IGetPrintJobHistoryQuery,
  IGetBackupsQuery,
  IGetBackupDetailQuery,
  IGetSyncStatusQuery,
  IGetSyncHistoryQuery,
  IGetQueueStatsQuery,
  IGetCurrentUserQuery,
  IGetUserPermissionsQuery,
  IGetWorkspaceQuery,
  IGetWorkspaceStatsQuery,
  IGetBranchQuery,
  IGetBranchesQuery,
  IGetActiveCounterQuery,
  IGetCounterHistoryQuery,
  IGetPaymentsQuery,
  IGetPaymentSummaryQuery,
  IGetSettingsQuery,
  IGetSettingQuery,
} from './IMiscQueries';
