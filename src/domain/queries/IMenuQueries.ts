/**
 * Menu & Product Query Interfaces.
 * CQRS queries for reading menu and product data.
 * Interface only. No implementation.
 */

import type { IQuery, IQueryResult } from '../shared/IQuery';
import type { Product, Category } from '../../types/models';

export interface IGetMenuQuery extends IQuery<Product> {
  categoryId?: string;
  includeInactive?: boolean;
}

export interface IGetProductQuery extends IQuery<Product> {
  productId: string;
}

export interface IGetProductsByCategoryQuery extends IQuery<Product> {
  categoryId: string;
}

export interface ISearchProductsQuery extends IQuery<Product> {
  query: string;
}

export interface IGetCategoriesQuery extends IQuery<Category> {
  parentId?: string;
}

export interface IGetPopularProductsQuery extends IQuery<Product> {
  startDate: string;
  endDate: string;
  limit?: number;
}
