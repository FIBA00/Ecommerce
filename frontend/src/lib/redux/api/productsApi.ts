/**
 * [EDUCATIONAL NOTE: Products RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Powers catalog browsing, keyword search, price/category filtering, sorting, and detail views.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `getProducts`: `GET /api/products` -> `ProductsController.getProducts()` -> TypeORM SelectQueryBuilder.
 *    - `getProductById`: `GET /api/products/:id` -> `ProductsController.getProductById()`.
 * 
 * 3. Cache Tags:
 *    - Provides granular tags (`{ type: 'Product', id }` and `{ type: 'Product', id: 'LIST' }`).
 *    - When `checkout` decrements inventory, RTK Query refetches products so UI reflects updated stock.
 */

import { apiSlice } from './apiSlice';
import type { Product, ProductsResponse, GetProductsQueryParams } from '../../../types';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, GetProductsQueryParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.set('search', params.search);
        if (params?.category) queryParams.set('category', params.category);
        if (params?.minPrice !== undefined && params.minPrice !== null && !isNaN(params.minPrice)) {
          queryParams.set('minPrice', String(params.minPrice));
        }
        if (params?.maxPrice !== undefined && params.maxPrice !== null && !isNaN(params.maxPrice)) {
          queryParams.set('maxPrice', String(params.maxPrice));
        }
        if (params?.sortBy) queryParams.set('sortBy', params.sortBy);
        if (params?.page) queryParams.set('page', String(params.page));
        if (params?.limit) queryParams.set('limit', String(params.limit));

        const queryString = queryParams.toString();
        return queryString ? `/products?${queryString}` : '/products';
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Product' as const, id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    getProductById: builder.query<Product, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
} = productsApi;
