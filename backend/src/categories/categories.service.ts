/**
 * [EDUCATIONAL NOTE: NestJS CategoriesService]
 * 
 * 1. Architecture Role:
 *    Fetches catalog categories from PostgreSQL via TypeORM.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Supplies category list to Next.js navigation chips and product filter bars.
 *    - Endpoint: `GET /api/categories` mapped to `categoriesApi.useGetCategoriesQuery()`.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }
}
