/**
 * ProductQueryHandlers.ts — Query handlers for Product/Menu queries.
 */

import type { IApplicationContext } from '../common/ApplicationContext';
import { Result } from '../common/Result';
import type { PaginatedResult } from '../common/IQueryHandler';
import type { IProductRepository } from '../../repositories/IProductRepository';
import type { ILogger } from '../common/IApplicationService';
import type { Product } from '../../types/models';

export class ProductQueryHandlers {
  constructor(
    private _productRepo: IProductRepository,
    private _logger: ILogger,
  ) {}

  async getMenu(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Product>>> {
    let products: Product[];
    if (query.categoryId) {
      products = await this._productRepo.findByCategory(query.categoryId);
    } else {
      products = query.includeInactive
        ? await this._productRepo.findAll({ limit: query.limit ?? 200, offset: query.offset, orderBy: 'name' })
        : await this._productRepo.findActive({ limit: query.limit ?? 200, offset: query.offset, orderBy: 'name' });
    }
    return Result.ok(this._toPage(products, query));
  }

  async getProduct(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Product>>> {
    const product = await this._productRepo.findById(query.productId);
    return Result.ok(this._single(product, query));
  }

  async getProductsByCategory(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Product>>> {
    const products = await this._productRepo.findByCategory(query.categoryId);
    return Result.ok(this._toPage(products, query));
  }

  async searchProducts(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Product>>> {
    const products = await this._productRepo.search(query.query, {
      limit: query.limit ?? 50,
      offset: query.offset,
    });
    return Result.ok(this._toPage(products, query));
  }

  async getCategories(_query: any, _ctx: IApplicationContext): Promise<Result<PaginatedResult<any>>> {
    return Result.ok({ items: [], totalCount: 0, offset: 0, limit: 50, hasNextPage: false, hasPreviousPage: false, totalPages: 0, executionTimeMs: 0 });
  }

  async getPopularProducts(query: any, ctx: IApplicationContext): Promise<Result<PaginatedResult<Product>>> {
    const products = await this._productRepo.findActive({ limit: query.limit ?? 20 });
    return Result.ok(this._toPage(products, query));
  }

  private _toPage<T>(items: T[], query: any): PaginatedResult<T> {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const totalCount = items.length;
    const sliced = items.slice(offset, offset + limit);
    return { items: sliced, totalCount, offset, limit, hasNextPage: offset + limit < totalCount, hasPreviousPage: offset > 0, totalPages: Math.ceil(totalCount / limit), executionTimeMs: 0 };
  }

  private _single<T>(item: T | null, query: any): PaginatedResult<T> {
    const items = item ? [item] : [];
    return { items, totalCount: items.length, offset: 0, limit: 1, hasNextPage: false, hasPreviousPage: false, totalPages: items.length, executionTimeMs: 0 };
  }
}
