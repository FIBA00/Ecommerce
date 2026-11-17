/**
 * [EDUCATIONAL NOTE: NestJS CategoriesController]
 * 
 * 1. Architecture Role:
 *    Exposes public category catalog endpoints under `/api/categories`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `GET /api/categories` -> `categoriesApi.useGetCategoriesQuery()`
 *    - Public endpoint (no authentication guard required).
 */

import { Controller, Get } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getCategories() {
    return this.categoriesService.findAll();
  }
}
