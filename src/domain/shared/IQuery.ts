/**
 * IQuery — base CQRS query interface.
 * Queries express intent to read state without side effects.
 * Interface only. No implementation.
 */

export interface IQuery<TResult = unknown> {
  /** Unique query identifier (for tracing) */
  queryId: string;

  /** ISO-8601 timestamp when the query was issued */
  issuedAt: string;

  /** User ID who issued the query */
  issuedBy: string;

  /** Device ID */
  deviceId: string;

  /** Workspace context */
  workspaceId: string;

  /** Branch context */
  branchId: string;

  /** Maximum results to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Field to sort by */
  sortBy?: string;
}

export interface IQueryResult<TResult = unknown> {
  /** Whether the query succeeded */
  success: boolean;

  /** Query results */
  data: TResult[];

  /** Total count matching the query (for pagination) */
  totalCount: number;

  /** Error message if failed */
  error: string | null;

  /** Query execution time in milliseconds */
  executionTimeMs: number;
}
