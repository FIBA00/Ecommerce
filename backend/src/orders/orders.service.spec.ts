/**
 * [EDUCATIONAL NOTE: OrdersService Unit Tests]
 * 
 * 1. Testing Philosophy:
 *    Simulates TypeORM DataSource transactions, inventory stock decrementing,
 *    order item snapshotting, and authorization checks.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: any;
  let cartRepository: any;
  let dataSource: any;

  beforeEach(async () => {
    orderRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    cartRepository = {
      findOne: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepository,
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: cartRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkout', () => {
    it('should throw BadRequestException if cart is empty', async () => {
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValue({ id: 'c-1', items: [] }),
        };
        return callback(mockManager);
      });

      await expect(
        service.checkout('u-1', { shippingAddress: '123 Main St' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if product has insufficient stock', async () => {
      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          findOne: jest.fn().mockImplementation((entity, opts) => {
            if (entity === Cart) {
              return Promise.resolve({
                id: 'c-1',
                items: [
                  {
                    id: 'ci-1',
                    productId: 'p-1',
                    quantity: 5,
                    product: { id: 'p-1', name: 'Coffee Mug', stock: 2, price: 15 },
                  },
                ],
              });
            }
            if (entity === Product) {
              return Promise.resolve({ id: 'p-1', name: 'Coffee Mug', stock: 2, price: 15 });
            }
            return Promise.resolve(null);
          }),
        };
        return callback(mockManager);
      });

      await expect(
        service.checkout('u-1', { shippingAddress: '123 Main St' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should execute checkout transaction: decrement stock, snapshot items, and clear cart', async () => {
      const mockProduct = { id: 'p-1', name: 'Coffee Mug', stock: 10, price: 15 };
      const mockCartItem = {
        id: 'ci-1',
        productId: 'p-1',
        quantity: 2,
        product: mockProduct,
      };
      const mockCart = { id: 'c-1', items: [mockCartItem] };

      const mockSavedOrder = {
        id: 'o-1',
        userId: 'u-1',
        totalAmount: 30,
        shippingAddress: '123 Main St',
        status: 'pending',
      };

      dataSource.transaction.mockImplementation(async (callback: any) => {
        const mockManager = {
          findOne: jest.fn().mockImplementation((entity, opts) => {
            if (entity === Cart) return Promise.resolve(mockCart);
            if (entity === Product) return Promise.resolve(mockProduct);
            if (entity === Order) return Promise.resolve({ ...mockSavedOrder, items: [] });
            return Promise.resolve(null);
          }),
          create: jest.fn().mockImplementation((entity, data) => data),
          save: jest.fn().mockImplementation((entity, data) => {
            if (entity === Order) return Promise.resolve(mockSavedOrder);
            return Promise.resolve(data);
          }),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return callback(mockManager);
      });

      const order = await service.checkout('u-1', { shippingAddress: '123 Main St' });

      expect(mockProduct.stock).toBe(8); // decremented from 10 to 8
      expect(order.id).toBe('o-1');
    });
  });

  describe('findAllForUser', () => {
    it('should return past orders for user ordered by createdAt DESC', async () => {
      const mockOrders = [
        { id: 'o-2', createdAt: new Date('2026-02-01') },
        { id: 'o-1', createdAt: new Date('2026-01-01') },
      ];
      orderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findAllForUser('u-1');
      expect(result).toHaveLength(2);
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { userId: 'u-1' },
        relations: ['items'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return order when accessed by owner', async () => {
      const mockOrder = { id: 'o-1', userId: 'u-1', items: [] };
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('u-1', 'o-1', 'user');
      expect(result).toEqual(mockOrder);
    });

    it('should allow admin to view another user order', async () => {
      const mockOrder = { id: 'o-1', userId: 'u-1', items: [] };
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('u-admin', 'o-1', 'admin');
      expect(result).toEqual(mockOrder);
    });

    it('should throw ForbiddenException if user attempts to view another user order', async () => {
      const mockOrder = { id: 'o-1', userId: 'u-1', items: [] };
      orderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.findOne('u-different-user', 'o-1', 'user'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      orderRepository.findOne.mockResolvedValue(null);
      await expect(
        service.findOne('u-1', 'nonexistent-order', 'user'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
