/**
 * [EDUCATIONAL NOTE: NestJS End-to-End & Integration Tests]
 * 
 * 1. Testing Philosophy:
 *    Uses @nestjs/testing and supertest to exercise the entire NestJS HTTP pipeline:
 *    Routing, ValidationPipe, CORS, Status Codes, and Controllers.
 * 
 * 2. Full-Stack Verification:
 *    Simulates the exact HTTP requests that Next.js RTK Query client dispatches
 *    across all feature domains (Auth, Users, Categories, Products, Cart, Orders).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { CategoriesController } from '../src/categories/categories.controller';
import { CategoriesService } from '../src/categories/categories.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsService } from '../src/products/products.service';
import { CartController } from '../src/cart/cart.controller';
import { CartService } from '../src/cart/cart.service';
import { OrdersController } from '../src/orders/orders.controller';
import { OrdersService } from '../src/orders/orders.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'shopper@example.com',
    name: 'Test Shopper',
    role: 'user',
    address: '123 E2E Street',
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue({
      accessToken: 'test-token',
      user: mockUser,
    }),
    login: jest.fn().mockResolvedValue({
      accessToken: 'test-token',
      user: mockUser,
    }),
    getProfile: jest.fn().mockResolvedValue(mockUser),
  };

  const mockCategoriesService = {
    findAll: jest.fn().mockResolvedValue([
      { id: 'c-1', name: 'Electronics', slug: 'electronics' },
      { id: 'c-2', name: 'Books', slug: 'books' },
    ]),
  };

  const mockProductsService = {
    findAll: jest.fn().mockResolvedValue({
      items: [
        { id: '22222222-2222-2222-2222-222222222222', name: 'Headphones', price: 99.99, stock: 15 },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    }),
    findOne: jest.fn().mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Headphones',
      price: 99.99,
      stock: 15,
      category: { id: 'c-1', name: 'Electronics' },
    }),
  };

  const mockCartService = {
    getCart: jest.fn().mockResolvedValue({
      id: 'cart-1',
      userId: mockUser.id,
      items: [],
      cartTotal: 0,
      itemCount: 0,
    }),
    addItem: jest.fn().mockResolvedValue({
      id: 'cart-1',
      userId: mockUser.id,
      items: [{ id: '33333333-3333-3333-3333-333333333333', productId: '22222222-2222-2222-2222-222222222222', quantity: 1 }],
      cartTotal: 99.99,
      itemCount: 1,
    }),
    updateItem: jest.fn().mockResolvedValue({
      id: 'cart-1',
      userId: mockUser.id,
      items: [{ id: '33333333-3333-3333-3333-333333333333', productId: '22222222-2222-2222-2222-222222222222', quantity: 2 }],
      cartTotal: 199.98,
      itemCount: 2,
    }),
    removeItem: jest.fn().mockResolvedValue({
      id: 'cart-1',
      userId: mockUser.id,
      items: [],
      cartTotal: 0,
      itemCount: 0,
    }),
    clearCart: jest.fn().mockResolvedValue({ message: 'Cart cleared successfully' }),
  };

  const mockOrdersService = {
    checkout: jest.fn().mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      userId: mockUser.id,
      totalAmount: 99.99,
      shippingAddress: '123 E2E Street',
      status: 'pending',
      items: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          productTitle: 'Headphones',
          price: 99.99,
          quantity: 1,
        },
      ],
    }),
    findAllForUser: jest.fn().mockResolvedValue([
      { id: '44444444-4444-4444-4444-444444444444', totalAmount: 99.99, status: 'pending' },
    ]),
    findOne: jest.fn().mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      userId: mockUser.id,
      totalAmount: 99.99,
      items: [],
    }),
  };

  const mockUsersService = {
    getProfile: jest.fn().mockResolvedValue(mockUser),
    updateProfile: jest.fn().mockResolvedValue({
      ...mockUser,
      name: 'Updated Name',
      address: '456 New Road',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        CategoriesController,
        ProductsController,
        CartController,
        OrdersController,
        UsersController,
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: CartService, useValue: mockCartService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Flow (/api/auth)', () => {
    it('POST /api/auth/register - rejects invalid body (ValidationPipe)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: '123' })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('email'),
          expect.stringContaining('Password'),
        ]),
      );
    });

    it('POST /api/auth/register - creates new user and returns token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'shopper@example.com',
          password: 'password123',
          name: 'Test Shopper',
        })
        .expect(201);

      expect(res.body.accessToken).toBe('test-token');
      expect(res.body.user.email).toBe('shopper@example.com');
    });

    it('POST /api/auth/login - validates credentials and returns token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'shopper@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(res.body.accessToken).toBe('test-token');
    });

    it('GET /api/auth/me - returns authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(200);

      expect(res.body.id).toBe(mockUser.id);
      expect(res.body.email).toBe('shopper@example.com');
    });
  });

  describe('Categories (/api/categories)', () => {
    it('GET /api/categories - returns list of categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].slug).toBe('electronics');
    });
  });

  describe('Products (/api/products)', () => {
    it('GET /api/products - returns paginated product list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products?page=1&limit=10')
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.page).toBe(1);
    });

    it('GET /api/products/:id - returns product details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/products/22222222-2222-2222-2222-222222222222')
        .expect(200);

      expect(res.body.id).toBe('22222222-2222-2222-2222-222222222222');
      expect(res.body.name).toBe('Headphones');
    });
  });

  describe('Cart Operations (/api/cart)', () => {
    it('GET /api/cart - retrieves user cart', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cart')
        .expect(200);

      expect(res.body.id).toBe('cart-1');
      expect(res.body.cartTotal).toBe(0);
    });

    it('POST /api/cart/items - adds item to cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/cart/items')
        .send({
          productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          quantity: 1,
        })
        .expect(201);

      expect(res.body.itemCount).toBe(1);
      expect(res.body.cartTotal).toBe(99.99);
    });

    it('PATCH /api/cart/items/:itemId - updates item quantity', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/cart/items/33333333-3333-3333-3333-333333333333')
        .send({ quantity: 2 })
        .expect(200);

      expect(res.body.itemCount).toBe(2);
    });

    it('DELETE /api/cart/items/:itemId - removes item from cart', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/cart/items/33333333-3333-3333-3333-333333333333')
        .expect(200);

      expect(res.body.items).toEqual([]);
    });

    it('DELETE /api/cart - clears cart', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/cart')
        .expect(200);

      expect(res.body.message).toBe('Cart cleared successfully');
    });
  });

  describe('Orders (/api/orders)', () => {
    it('POST /api/orders/checkout - places order from cart', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders/checkout')
        .send({ shippingAddress: '123 E2E Street' })
        .expect(201);

      expect(res.body.id).toBe('44444444-4444-4444-4444-444444444444');
      expect(res.body.shippingAddress).toBe('123 E2E Street');
      expect(res.body.items[0].productTitle).toBe('Headphones');
    });

    it('GET /api/orders - returns user order history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe('44444444-4444-4444-4444-444444444444');
    });

    it('GET /api/orders/:id - returns order receipt', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/orders/44444444-4444-4444-4444-444444444444')
        .expect(200);

      expect(res.body.id).toBe('44444444-4444-4444-4444-444444444444');
    });
  });

  describe('Users Profile (/api/users)', () => {
    it('GET /api/users/profile - returns user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users/profile')
        .expect(200);

      expect(res.body.email).toBe('shopper@example.com');
    });

    it('PATCH /api/users/profile - updates user profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .send({ name: 'Updated Name', address: '456 New Road' })
        .expect(200);

      expect(res.body.name).toBe('Updated Name');
      expect(res.body.address).toBe('456 New Road');
    });
  });
});
