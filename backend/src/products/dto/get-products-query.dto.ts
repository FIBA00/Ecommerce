/**
 * [EDUCATIONAL NOTE: Products Query DTO]
 * 
 * 1. Architecture Role:
 *    Parses, validates, and transforms HTTP GET query parameters for the product catalog.
 *    Supports full search, category filtering, min/max price range, sorting, and pagination.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Bound to Next.js URL query params (e.g. `?search=phone&category=electronics&page=1`).
 *    - Consumed by `productsApi.useGetProductsQuery(queryParams)`.
 */

import { IsOptional, IsString, IsNumber, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export type ProductSortBy = 'price_asc' | 'price_desc' | 'newest' | 'name';

export class GetProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(['price_asc', 'price_desc', 'newest', 'name'])
  sortBy?: ProductSortBy;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 12;
}
