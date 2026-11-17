/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM Order Entity]
 * 
 * 1. Architecture Role:
 *    Represents a finalized customer order record. Generated during checkout by converting
 *    the ephemeral items in a user's cart into immutable order records.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Consumed by Next.js components: `OrderList`, `OrderCard`, `OrderReceiptPage`.
 *    - Handled via RTK Query endpoints:
 *      - `ordersApi.useCheckoutMutation()` -> transactional checkout executing cart-to-order flow
 *      - `ordersApi.useGetOrdersQuery()` -> list of user's past purchases
 *      - `ordersApi.useGetOrderByIdQuery(id)` -> detailed order receipt
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "orders"
 *    - Status Workflow: 'pending' -> 'processing' -> 'shipped' -> 'delivered' -> 'cancelled'
 *    - Financial Precision: `totalAmount` stored as `decimal(10, 2)` with transformer.
 *    - Relations:
 *      - ManyToOne with User (`userId` foreign key).
 *      - OneToMany with OrderItem: All purchased line items saved with cascade insert.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  totalAmount: number;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: OrderStatus;

  @Column({ type: 'text' })
  shippingAddress: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
