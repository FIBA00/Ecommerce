/**
 * [EDUCATIONAL NOTE: NestJS CartService]
 * 
 * 1. Architecture Role:
 *    Manages the customer shopping cart lifecycle, real-time stock checks,
 *    line item accumulation, and financial total calculations.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Informs RTK Query `cartApi` endpoints:
 *      - `useGetCartQuery()`
 *      - `useAddToCartMutation()`
 *      - `useUpdateCartQuantityMutation()`
 *      - `useRemoveCartItemMutation()`
 *      - `useClearCartMutation()`
 * 
 * 3. Business Logic & Boundary Guards:
 *    - Guarantees that users cannot add more items than available in physical stock.
 *    - Automatically computes `cartTotal` and `itemCount` on every read and write.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  cartTotal: number;
  itemCount: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async getCart(userId: string): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const items = cart.items || [];
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = Number(
      items
        .reduce((sum, item) => {
          const price = item.product ? Number(item.product.price) : 0;
          return sum + item.quantity * price;
        }, 0)
        .toFixed(2),
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items,
      cartTotal,
      itemCount,
    };
  }

  async addItem(userId: string, addDto: AddCartItemDto): Promise<CartResponse> {
    const product = await this.productRepository.findOne({
      where: { id: addDto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${addDto.productId}" not found`);
    }

    if (product.stock < addDto.quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`,
      );
    }

    const cart = await this.getOrCreateCart(userId);

    const performAdd = async (
      itemRepo: Repository<CartItem>,
      prodRepo: Repository<Product>,
    ) => {
      const liveProduct = await prodRepo.findOne({
        where: { id: addDto.productId },
      });
      const currentStock = liveProduct ? liveProduct.stock : product.stock;

      let existingItem = await itemRepo.findOne({
        where: { cartId: cart.id, productId: product.id },
        relations: ['product'],
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + addDto.quantity;
        if (newQuantity > currentStock) {
          throw new BadRequestException(
            `Cannot add ${addDto.quantity} more. Maximum available stock is ${currentStock} (currently ${existingItem.quantity} in cart).`,
          );
        }
        existingItem.quantity = newQuantity;
        await itemRepo.save(existingItem);
      } else {
        const newItem = itemRepo.create({
          cartId: cart.id,
          productId: product.id,
          quantity: addDto.quantity,
        });
        await itemRepo.save(newItem);
      }
    };

    try {
      if (
        this.cartRepository.manager &&
        typeof this.cartRepository.manager.transaction === 'function'
      ) {
        await this.cartRepository.manager.transaction(async (manager) => {
          await manager.findOne(Cart, {
            where: { id: cart.id },
            lock: { mode: 'pessimistic_write' },
          });
          await performAdd(
            manager.getRepository(CartItem),
            manager.getRepository(Product),
          );
        });
      } else {
        await performAdd(this.cartItemRepository, this.productRepository);
      }
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      // If a concurrent insert raced and hit unique constraint violation, retry update
      if (
        err?.code === '23505' ||
        err?.message?.includes('duplicate key') ||
        err?.message?.includes('unique constraint')
      ) {
        const existingItem = await this.cartItemRepository.findOne({
          where: { cartId: cart.id, productId: product.id },
        });
        if (existingItem) {
          const newQuantity = existingItem.quantity + addDto.quantity;
          if (newQuantity > product.stock) {
            throw new BadRequestException(
              `Cannot add ${addDto.quantity} more. Maximum available stock is ${product.stock} (currently ${existingItem.quantity} in cart).`,
            );
          }
          existingItem.quantity = newQuantity;
          await this.cartItemRepository.save(existingItem);
        }
      } else {
        throw err;
      }
    }

    return this.getCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: ['product'],
    });

    if (!item) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found`);
    }

    if (updateDto.quantity <= 0) {
      await this.cartItemRepository.remove(item);
    } else {
      if (item.product && updateDto.quantity > item.product.stock) {
        throw new BadRequestException(
          `Requested quantity (${updateDto.quantity}) exceeds available stock (${item.product.stock}).`,
        );
      }
      item.quantity = updateDto.quantity;
      await this.cartItemRepository.save(item);
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found`);
    }

    await this.cartItemRepository.remove(item);

    return this.getCart(userId);
  }

  async clearCart(userId: string): Promise<{ message: string }> {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemRepository.delete({ cartId: cart.id });
    return { message: 'Cart cleared successfully' };
  }
}
