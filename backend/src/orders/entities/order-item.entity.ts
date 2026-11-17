/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM OrderItem Entity (Data Snapshotting)]
 * 
 * 1. Architecture Role:
 *    Represents an immutable receipt line item attached to a finalized Order.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Rendered in Next.js order detail views and invoices.
 *    - Returned as part of `Order` when querying `ordersApi.useGetOrderByIdQuery(id)`.
 * 
 * 3. Crucial Ecommerce Architecture Concept — Snapshotting:
 *    - In an online store, product prices and titles frequently change or products may be deleted.
 *    - An OrderItem MUST SNAPSHOT the exact `productTitle` and `price` at the second of checkout!
 *    - If `productId` is deleted or changed in the catalog, historic order total amounts and receipts
 *      remain 100% accurate, legally compliant, and immutable.
 *    - Relation to Product has `nullable: true` and `onDelete: 'SET NULL'`.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  /**
   * SNAPSHOTTED product name at the moment of checkout
   */
  @Column()
  productTitle: string;

  /**
   * SNAPSHOTTED product price at the moment of checkout
   */
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

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
