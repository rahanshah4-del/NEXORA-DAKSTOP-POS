/**
 * IQueryHandler.ts — Generic query handler contract for the CQRS query side.
 *
 * Queries are read-only — they never mutate state.
 * Query handlers return Result<T[]> with pagination metadata.
 */

import type { Result } from './Result';
import type { IApplicationContext } from './ApplicationContext';

// ── Query Result with Pagination ──

export interface PaginatedResult<T> {
  /** The result items for the current page. */
  items: T[];

  /** Total number of items matching the query (across all pages). */
  totalCount: number;

  /** Current page offset. */
  offset: number;

  /** Current page limit. */
  limit: number;

  /** Whether there are more pages after this one. */
  hasNextPage: boolean;

  /** Whether there are pages before this one. */
  hasPreviousPage: boolean;

  /** Total number of pages. */
  totalPages: number;

  /** Execution time in milliseconds. */
  executionTimeMs: number;
}

// ── Query Handler Interface ──

/**
 * IQueryHandler<TQuery, TResult>
 *
 * Implementations receive a query + context and return a paginated result.
 * Queries are always read-only — no side effects.
 *
 * @typeParam TQuery  - The query DTO (must extend IQuery from domain).
 * @typeParam TResult - The entity type being queried.
 */
export interface IQueryHandler<TQuery, TResult> {
  /** Unique query type this handler processes. */
  readonly queryType: string;

  /**
   * Execute the query.
   *
   * @param query   The query payload (includes pagination, sorting, filters).
   * @param context The application context.
   * @returns A paginated result of entities.
   */
  execute(query: TQuery, context: IApplicationContext): Promise<Result<PaginatedResult<TResult>>>;
}

// ── Query Handler Metadata ──

export interface QueryHandlerMetadata {
  queryType: string;
  handlerName: string;
  requiresAuth: boolean;
  requiredPermissions: string[];
  description: string;
}
