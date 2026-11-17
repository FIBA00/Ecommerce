/**
 * [EDUCATIONAL NOTE: UsersService Unit Tests]
 * 
 * 1. Testing Philosophy:
 *    Validates user profile retrieval, sanitized password exclusion,
 *    and partial profile update mutations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'u-1',
        email: 'user@example.com',
        name: 'Jane Doe',
        password: 'super-secret-hash',
        orders: [],
      });

      const profile = await service.getProfile('u-1');
      expect(profile.id).toBe('u-1');
      expect(profile.name).toBe('Jane Doe');
      expect((profile as any).password).toBeUndefined();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.getProfile('missing-u')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update name and shipping address and return sanitized user', async () => {
      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        name: 'Old Name',
        address: 'Old Address',
        password: 'hashed-password',
      };
      userRepository.findOne.mockResolvedValue(existingUser);

      const result = await service.updateProfile('u-1', {
        name: 'New Name',
        address: '789 New St, City',
      });

      expect(result.name).toBe('New Name');
      expect(result.address).toBe('789 New St, City');
      expect((result as any).password).toBeUndefined();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile('missing-u', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
