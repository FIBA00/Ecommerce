import { z } from 'zod';

/**
 * [EDUCATIONAL NOTE: Product Filter & Search Schema]
 * 
 * 1. Architecture Role:
 *    Validates and coerces catalog search query parameters, price filters, category, and sorting.
 * 
 * 2. Full-Stack Linkage (Next.js -> RTK Query -> NestJS -> PostgreSQL):
 *    - Validates filter controls on `src/app/products/page.tsx`
 *    - Transmitted via `productsApi.useGetProductsQuery(queryParams)`
 *    - Directly mirrors NestJS `GetProductsQueryDto` (`backend/src/products/dto/get-products-query.dto.ts`)
 *    - Translated into PostgreSQL TypeORM `SelectQueryBuilder` SQL queries with WHERE clauses.
 * 
 * 3. State & Validation Mechanics:
 *    - Non-negative price validation.
 *    - Cross-field validation ensuring minPrice <= maxPrice.
 *    - Strict sortBy enum matching backend accepted options.
 */

export const filterSchema = z
  .object({
    search: z.string().optional(),
    category: z.string().optional(),
    minPrice: z
      .coerce
      .number()
      .min(0, 'Minimum price must be non-negative')
      .optional(),
    maxPrice: z
      .coerce
      .number()
      .min(0, 'Maximum price must be non-negative')
      .optional(),
    sortBy: z
      .enum(['price_asc', 'price_desc', 'newest', 'name'])
      .optional(),
    page: z
      .coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .optional(),
    limit: z
      .coerce
      .number()
      .int()
      .min(1)
      .default(12)
      .optional(),
  })
  .refine(
    (data) => {
      if (
        data.minPrice !== undefined &&
        data.maxPrice !== undefined &&
        !isNaN(data.minPrice) &&
        !isNaN(data.maxPrice)
      ) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: 'Minimum price cannot be greater than maximum price',
      path: ['minPrice'],
    }
  );

export type FilterFormData = z.infer<typeof filterSchema>;
