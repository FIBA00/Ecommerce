/**
 * [EDUCATIONAL NOTE: NestJS ProductsService]
 * 
 * 1. Architecture Role:
 *    Handles business logic for the product catalog. Executes SQL query construction
 *    via TypeORM's `SelectQueryBuilder` to perform search, filtering, and pagination.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `findAll` powers the main Next.js `/products` page and search bar.
 *    - `findOne` powers the Next.js dynamic route `/products/[id]`.
 * 
 * 3. TypeORM Query Builder Highlights:
 *    - Left joins `category` relation so product details include category names & slugs.
 *    - Applies case-insensitive text search using SQL `LOWER(...) LIKE ...`.
 *    - Filters by either category UUID or human-readable slug.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

export interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findAll(query: GetProductsQueryDto): Promise<PaginatedProductsResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 12);
    const skip = (page - 1) * limit;

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category');

    // 1. Text Search across name and description
    if (query.search && query.search.trim()) {
      const searchTerm = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.name) LIKE :searchTerm OR LOWER(product.description) LIKE :searchTerm)',
        { searchTerm },
      );
    }

    // 2. Category filter by UUID or slug
    if (query.category && query.category.trim()) {
      const cat = query.category.trim();
      qb.andWhere('(category.id::text = :cat OR category.slug = :cat)', { cat });
    }

    // 3. Price boundary filtering
    if (query.minPrice !== undefined && !isNaN(query.minPrice)) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined && !isNaN(query.maxPrice)) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    // 4. Sorting logic
    switch (query.sortBy) {
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'name':
        qb.orderBy('product.name', 'ASC');
        break;
      case 'newest':
      default:
        qb.orderBy('product.createdAt', 'DESC');
        break;
    }

    // 5. Pagination
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }
}
