/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM Category Entity]
 * 
 * 1. Architecture Role:
 *    Defines the product classification schema. Used by `CategoriesModule` and `ProductsModule`
 *    to categorize inventory items in an ecommerce store.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Maps to Next.js catalog sidebar/filter components.
 *    - Handled via RTK Query endpoint:
 *      - `categoriesApi.useGetCategoriesQuery()` -> fetches categories for filter chips/dropdowns
 *    - The `slug` field enables SEO-friendly URL routes on the frontend (e.g., `/products?category=electronics`).
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "categories"
 *    - Primary Key: UUID generated via `@PrimaryGeneratedColumn('uuid')`.
 *    - Unique Index: `slug` prevents duplicate route identifiers.
 *    - Relations:
 *      - OneToMany with Product: One category contains zero or more products.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
