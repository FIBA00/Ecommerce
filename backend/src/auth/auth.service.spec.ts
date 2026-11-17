/**
 * [EDUCATIONAL NOTE: AuthService Unit Tests]
 * 
 * 1. Testing Philosophy:
 *    Uses @nestjs/testing Test module to inject mock TypeORM repositories and JwtService.
 *    Validates authentication flows, password verification, error conditions, and cart provisioning.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Cart } from '../cart/entities/cart.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let cartRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'mock-user-id', ...dto })),
      save: jest.fn().mockImplementation((user) => Promise.resolve({ id: 'mock-user-id', ...user })),
      createQueryBuilder: jest.fn(),
    };

    cartRepository = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'mock-cart-id', ...dto })),
      save: jest.fn().mockImplementation((cart) => Promise.resolve({ id: 'mock-cart-id', ...cart })),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: cartRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user and provision an active cart', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.register({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'mock-user-id' }),
      );
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('newuser@example.com');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw ConflictException if email is already taken', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'existing-id', email: 'taken@example.com' });

      await expect(
        service.register({
          email: 'taken@example.com',
          password: 'password123',
          name: 'Taken User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials and return accessToken', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const mockUser = {
        id: 'u-1',
        email: 'user@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: 'user',
      };

      const qb: any = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.login({
        email: 'user@example.com',
        password: 'correctPassword',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('user@example.com');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const qb: any = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login({
          email: 'unknown@example.com',
          password: 'anyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correctPassword', 10);
      const mockUser = {
        id: 'u-1',
        email: 'user@example.com',
        password: hashedPassword,
        name: 'John Doe',
      };

      const qb: any = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return sanitized user profile', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        password: 'hashed-secret',
        name: 'John Doe',
        role: 'user',
      });

      const profile = await service.getProfile('u-1');
      expect(profile.id).toBe('u-1');
      expect((profile as any).password).toBeUndefined();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.getProfile('missing-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
