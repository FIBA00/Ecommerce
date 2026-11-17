/**
 * [EDUCATIONAL NOTE: NestJS AppModule]
 * 
 * 1. Architecture Role:
 *    The root application module that brings together configuration, database connectivity,
 *    and all domain feature modules (Auth, Users, Categories, Products, Cart, Orders).
 * 
 * 2. Structure & Dependency Flow:
 *    - ConfigModule: Loads `.env` configuration globally (`isGlobal: true`).
 *    - DatabaseModule: Establishes asynchronous connection to PostgreSQL via TypeORM.
 *    - Domain Feature Modules: Register their controllers and business services.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
  ],
})
export class AppModule {}
