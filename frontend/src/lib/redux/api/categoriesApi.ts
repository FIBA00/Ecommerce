/**
 * [EDUCATIONAL NOTE: Categories RTK Query Endpoints]
 * 
 * 1. Architecture Role:
 *    Retrieves category catalog list for filter chips and navigation.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - `getCategories`: `GET /api/categories` -> `CategoriesController.getCategories()` -> `categories` table.
 */

import { apiSlice } from './apiSlice';
import type { Category } from '../../../types';

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<Category[], void>({
      query: () => '/categories',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Category' as const, id })),
              { type: 'Category', id: 'LIST' },
            ]
          : [{ type: 'Category', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
} = categoriesApi;
