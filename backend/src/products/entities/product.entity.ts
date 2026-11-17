/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM Product Entity]
 * 
 * 1. Architecture Role:
 *    The core domain entity representing sellable merchandise in the ecommerce platform.
 *    Managed by `ProductsModule` for search, filtering, inventory validation, and pricing.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Consumed by Next.js components: `ProductCard`, `ProductGrid`, `ProductDetailView`.
 *    - Handled via RTK Query endpoints:
 *      - `productsApi.useGetProductsQuery(filters)` -> catalog grid with search, sort, pagination
 *      - `productsApi.useGetProductByIdQuery(id)` -> individual product page
 *    - Used by `cartApi.useAddToCartMutation()` to verify availability and stock bounds.
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "products"
 *    - Primary Key: UUID.
 *    - Price: Stored as `decimal(10, 2)` with a custom Column transformer so the backend
 *      always receives a JavaScript `number` instead of a raw SQL string.
 *    - Stock: Integer tracking physical warehouse count.
 *    - Relations:
 *      - ManyToOne with Category (`categoryId` foreign key).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column()
  imageUrl: string;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
