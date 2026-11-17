/**
 * [EDUCATIONAL NOTE: NestJS & TypeORM Cart Entity]
 * 
 * 1. Architecture Role:
 *    Represents the active shopping cart container owned by a registered user.
 *    Managed by `CartModule` to coordinate items, quantities, and live price subtotals.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Consumed by Next.js components: `Navbar` (item count badge), `CartDrawer`, `CartPage`.
 *    - Handled via RTK Query endpoints:
 *      - `cartApi.useGetCartQuery()` -> live cart state with items and subtotal
 *      - `cartApi.useClearCartMutation()` -> clears cart items
 *    - Automatically invalidated whenever items are added, updated, or removed (`Cart` tag).
 * 
 * 3. Database & Relational Mapping (PostgreSQL):
 *    - Table: "carts"
 *    - Relations:
 *      - OneToOne with User: Direct foreign key `userId` ensuring one persistent cart per account.
 *      - OneToMany with CartItem: Cascade delete enabled so removing a cart cleans up all line items.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
