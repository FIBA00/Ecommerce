/**
 * [EDUCATIONAL NOTE: NestJS AuthService]
 * 
 * 1. Architecture Role:
 *    Handles business logic for user authentication, password hashing via bcryptjs,
 *    and JWT generation via @nestjs/jwt. Coordinates with `User` and `Cart` repositories.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - Invoked when Next.js dispatches:
 *      - `POST /api/auth/register` (Register Form submission)
 *      - `POST /api/auth/login` (Login Form submission)
 *    - Returns `{ accessToken, user }`, which Next.js stores in Redux to maintain session state.
 * 
 * 3. Database & Relational Coordination:
 *    - On registration, automatically initializes an empty `Cart` linked to the new user,
 *      ensuring the user has an active cart ready immediately upon their first visit to the shop.
 */

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Cart } from '../cart/entities/cart.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.userRepository.findOne({
      where: { email: registerDto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email.toLowerCase().trim(),
      password: hashedPassword,
      name: registerDto.name.trim(),
      role: 'user',
    });

    const savedUser = await this.userRepository.save(user);

    // Automatically provision an active cart for the newly registered user
    const cart = this.cartRepository.create({
      userId: savedUser.id,
    });
    await this.cartRepository.save(cart);

    const accessToken = this.generateToken(savedUser);

    return {
      accessToken,
      user: this.sanitizeUser(savedUser),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: loginDto.email.toLowerCase().trim() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
