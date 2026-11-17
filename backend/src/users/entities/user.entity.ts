/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM User Entity]
 * 
 * 1. Architecture Role:
 *    Represents the database model for registered users within NestJS and TypeORM.
 *    Decorated with @Entity('users') to define table mapping and column behaviors.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Maps to Next.js authentication state (Redux authSlice) and RTK Query endpoints:
 *      - `authApi.useLoginMutation()` -> receives user data on login
 *      - `authApi.useRegisterMutation()` -> receives user data on registration
 *      - `authApi.useGetProfileQuery()` -> retrieves currently authenticated user
 *      - `authApi.useUpdateProfileMutation()` -> updates name and shipping address
 *    - The password column uses { select: false } to prevent accidental leakage in API responses.
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "users"
 *    - Primary Key: UUID generated automatically via `@PrimaryGeneratedColumn('uuid')`.
 *    - Relations:
 *      - OneToOne with Cart: Each user owns exactly one active shopping cart.
 *      - OneToMany with Order: A user can place multiple historic orders.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Cart } from '../../cart/entities/cart.entity';
import { Order } from '../../orders/entities/order.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'user' })
  role: UserRole;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @OneToOne(() => Cart, (cart) => cart.user, { cascade: true })
  cart: Cart;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
