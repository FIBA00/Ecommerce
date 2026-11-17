/**
 * [EDUCATIONAL NOTE: NestJS OrdersService (Atomic Transactions & Snapshotting)]
 * 
 * 1. Architecture Role:
 *    Handles the critical checkout lifecycle. Coordinates ACID-compliant transactions
 *    using TypeORM's `DataSource.transaction()`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `checkout()` -> invoked by `ordersApi.useCheckoutMutation()`
 *    - `findAllForUser()` -> invoked by `ordersApi.useGetOrdersQuery()`
 *    - `findOne()` -> invoked by `ordersApi.useGetOrderByIdQuery(id)`
 * 
 * 3. Atomic Transaction Flow:
 *    a. Fetch user's cart with items and live product details.
 *    b. Validate stock availability for every cart item.
 *    c. Decrement physical inventory stock for each product.
 *    d. Calculate exact monetary order total.
 *    e. Persist `Order` record with shipping address and 'pending' status.
 *    f. SNAPSHOT product names and prices into immutable `OrderItem` records.
 *    g. Wipe ephemeral items from user's cart.
 *    h. If any step fails, the entire transaction is rolled back by PostgreSQL.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
  ) {}

  async checkout(userId: string, checkoutDto: CheckoutDto): Promise<Order> {
    if (!checkoutDto.shippingAddress || !checkoutDto.shippingAddress.trim()) {
      throw new BadRequestException('Shipping address is required for checkout');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Load user's cart with all items and products
      const cart = await manager.findOne(Cart, {
        where: { userId },
        relations: ['items', 'items.product'],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cannot checkout: cart is empty');
      }

      // 2. Validate stock and acquire pessimistic write lock for each line item
      // Sort items by productId to guarantee consistent locking order and avoid deadlocks
      const sortedItems = [...cart.items].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );

      for (const item of sortedItems) {
        const product = await manager.findOne(Product, {
          where: { id: item.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new BadRequestException('A product in your cart is no longer available');
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}.`,
          );
        }

        // 3. Decrement stock atomically on locked entity
        product.stock -= item.quantity;
        await manager.save(Product, product);

        // Keep item.product updated with fresh locked data for price and receipt snapshotting
        item.product = product;
      }

      // 4. Calculate total amount
      const totalAmount = Number(
        cart.items
          .reduce(
            (sum, item) => sum + item.quantity * Number(item.product.price),
            0,
          )
          .toFixed(2),
      );

      // 5. Create Order record
      const order = manager.create(Order, {
        userId,
        totalAmount,
        status: 'pending',
        shippingAddress: checkoutDto.shippingAddress.trim(),
      });
      const savedOrder = await manager.save(Order, order);

      // 6. Create SNAPSHOTTED OrderItems (capturing title and price at moment of sale)
      const orderItems = cart.items.map((item) =>
        manager.create(OrderItem, {
          orderId: savedOrder.id,
          productId: item.productId,
          productTitle: item.product.name,
          price: Number(item.product.price),
          quantity: item.quantity,
        }),
      );
      await manager.save(OrderItem, orderItems);

      // 7. Clear cart items
      await manager.delete(CartItem, { cartId: cart.id });

      // 8. Return saved order with items
      const completeOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items'],
      });

      if (!completeOrder) {
        throw new NotFoundException('Failed to retrieve newly created order');
      }

      return completeOrder;
    });
  }

  async findAllForUser(userId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, orderId: string, userRole?: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (order.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }
}
