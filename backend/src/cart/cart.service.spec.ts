/**
 * [EDUCATIONAL NOTE: CartService Unit Tests]
 * 
 * 1. Testing Philosophy:
 *    Validates cart creation, subtotal and item count calculations, stock boundary enforcement,
 *    and cart mutation operations (add, update, delete, clear).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

describe('CartService', () => {
  let service: CartService;
  let cartRepository: any;
  let cartItemRepository: any;
  let productRepository: any;

  beforeEach(async () => {
    cartRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'c-1', ...dto })),
      save: jest.fn().mockImplementation((cart) => Promise.resolve({ id: 'c-1', ...cart })),
    };

    cartItemRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'ci-1', ...dto })),
      save: jest.fn().mockImplementation((item) => Promise.resolve({ id: 'ci-1', ...item })),
      remove: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    productRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Cart),
          useValue: cartRepository,
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: cartItemRepository,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should compute correct total and count for items in cart', async () => {
      const mockCart = {
        id: 'c-1',
        userId: 'u-1',
        items: [
          {
            id: 'ci-1',
            quantity: 2,
            product: { id: 'p-1', name: 'Product A', price: 10.5 },
          },
          {
            id: 'ci-2',
            quantity: 3,
            product: { id: 'p-2', name: 'Product B', price: 20.0 },
          },
        ],
      };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const result = await service.getCart('u-1');
      expect(result.itemCount).toBe(5);
      // (2 * 10.5) + (3 * 20.0) = 21 + 60 = 81
      expect(result.cartTotal).toBe(81);
    });

    it('should automatically provision a cart if user does not have one', async () => {
      cartRepository.findOne.mockResolvedValue(null);

      const result = await service.getCart('u-new');
      expect(cartRepository.create).toHaveBeenCalledWith({ userId: 'u-new' });
      expect(result.items).toEqual([]);
      expect(result.cartTotal).toBe(0);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(
        service.addItem('u-1', { productId: 'p-missing', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if requested quantity exceeds stock', async () => {
      productRepository.findOne.mockResolvedValue({
        id: 'p-1',
        name: 'Limited Item',
        stock: 3,
        price: 50,
      });

      await expect(
        service.addItem('u-1', { productId: 'p-1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add a new item when stock is sufficient', async () => {
      const mockProduct = { id: 'p-1', name: 'Shoes', stock: 10, price: 80 };
      productRepository.findOne.mockResolvedValue(mockProduct);

      const mockCart = { id: 'c-1', userId: 'u-1', items: [] };
      cartRepository.findOne.mockResolvedValue(mockCart);
      cartItemRepository.findOne.mockResolvedValue(null);

      const result = await service.addItem('u-1', { productId: 'p-1', quantity: 2 });
      expect(cartItemRepository.create).toHaveBeenCalledWith({
        cartId: 'c-1',
        productId: 'p-1',
        quantity: 2,
      });
      expect(cartItemRepository.save).toHaveBeenCalled();
    });

    it('should increment existing item quantity when stock allows', async () => {
      const mockProduct = { id: 'p-1', name: 'Shoes', stock: 10, price: 80 };
      productRepository.findOne.mockResolvedValue(mockProduct);

      const mockCart = { id: 'c-1', userId: 'u-1', items: [] };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const existingCartItem = {
        id: 'ci-1',
        cartId: 'c-1',
        productId: 'p-1',
        quantity: 3,
        product: mockProduct,
      };
      cartItemRepository.findOne.mockResolvedValue(existingCartItem);

      await service.addItem('u-1', { productId: 'p-1', quantity: 4 });
      expect(existingCartItem.quantity).toBe(7);
      expect(cartItemRepository.save).toHaveBeenCalledWith(existingCartItem);
    });
  });

  describe('updateItem', () => {
    it('should delete item if quantity is zero or less', async () => {
      const mockCart = { id: 'c-1', userId: 'u-1', items: [] };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const mockItem = { id: 'ci-1', quantity: 2, product: { stock: 10 } };
      cartItemRepository.findOne.mockResolvedValue(mockItem);

      await service.updateItem('u-1', 'ci-1', { quantity: 0 });
      expect(cartItemRepository.remove).toHaveBeenCalledWith(mockItem);
    });

    it('should throw BadRequestException if new quantity exceeds product stock', async () => {
      const mockCart = { id: 'c-1', userId: 'u-1', items: [] };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const mockItem = { id: 'ci-1', quantity: 2, product: { stock: 5 } };
      cartItemRepository.findOne.mockResolvedValue(mockItem);

      await expect(
        service.updateItem('u-1', 'ci-1', { quantity: 8 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeItem', () => {
    it('should remove item from user cart', async () => {
      const mockCart = { id: 'c-1', userId: 'u-1', items: [] };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const mockItem = { id: 'ci-1' };
      cartItemRepository.findOne.mockResolvedValue(mockItem);

      await service.removeItem('u-1', 'ci-1');
      expect(cartItemRepository.remove).toHaveBeenCalledWith(mockItem);
    });
  });

  describe('clearCart', () => {
    it('should clear all items belonging to user cart', async () => {
      const mockCart = { id: 'c-1', userId: 'u-1' };
      cartRepository.findOne.mockResolvedValue(mockCart);

      const result = await service.clearCart('u-1');
      expect(cartItemRepository.delete).toHaveBeenCalledWith({ cartId: 'c-1' });
      expect(result.message).toBe('Cart cleared successfully');
    });
  });
});
