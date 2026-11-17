/**
 * [EDUCATIONAL NOTE: ProductsService Unit Tests]
 * 
 * 1. Testing Philosophy:
 *    Mocks TypeORM SelectQueryBuilder to test SQL building logic, price filters,
 *    text searches, and sorting mechanisms in isolation.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: any;

  beforeEach(async () => {
    productRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: productRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should query products with pagination, search, filters, and sorting', async () => {
      const mockProducts = [
        { id: 'p-1', name: 'Keyboard', price: 99.99, stock: 10 },
        { id: 'p-2', name: 'Mouse', price: 49.99, stock: 20 },
      ];

      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockProducts, 2]),
      };

      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        search: 'key',
        category: 'electronics',
        minPrice: 50,
        maxPrice: 150,
        sortBy: 'price_asc',
        page: 1,
        limit: 10,
      });

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('product.category', 'category');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(product.name) LIKE :searchTerm'),
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('category.id::text = :cat OR category.slug = :cat'),
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price >= :minPrice',
        { minPrice: 50 },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.price <= :maxPrice',
        { maxPrice: 150 },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('product.price', 'ASC');
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should default to page 1, limit 12 and newest sort when no query params provided', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      productRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({});

      expect(qb.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(12);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a product with category when found', async () => {
      const mockProduct = {
        id: 'p-1',
        name: 'Headphones',
        category: { id: 'c-1', name: 'Electronics' },
      };
      productRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne('p-1');
      expect(result).toEqual(mockProduct);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        relations: ['category'],
      });
    });

    it('should throw NotFoundException when product does not exist', async () => {
      productRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
