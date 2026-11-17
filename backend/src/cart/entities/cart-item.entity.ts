/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM CartItem Entity]
 * 
 * 1. Architecture Role:
 *    Represents a specific product line item within an active shopping cart.
 *    Tracks the desired quantity and provides a relational bridge between Cart and Product.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Consumed by Next.js component: `CartItemRow`.
 *    - Handled via RTK Query endpoints:
 *      - `cartApi.useAddToCartMutation()` -> creates or increments CartItem
 *      - `cartApi.useUpdateCartQuantityMutation()` -> increments/decrements quantity
 *      - `cartApi.useRemoveCartItemMutation()` -> deletes line item
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "cart_items"
 *    - Foreign Keys: `cartId` (references carts) and `productId` (references products).
 *    - Cascade Behavior: `onDelete: 'CASCADE'` on cart reference guarantees cleanup when cart is reset.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('cart_items')
@Unique(['cartId', 'productId'])
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
