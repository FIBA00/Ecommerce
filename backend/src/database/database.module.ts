/**
 * [EDUCATIONAL NOTE: NestJS DatabaseModule]
 * 
 * 1. Architecture Role:
 *    Centralizes the TypeORM configuration and PostgreSQL connection setup.
 * 
 * 2. Configuration Settings:
 *    - Uses `TypeOrmModule.forRootAsync` to read database credentials from environment variables via ConfigService.
 *    - Defaults DB_PORT to 5433 to map to our containerized PostgreSQL and prevent local host 5432 conflicts.
 *    - `autoLoadEntities: true` automatically detects all entities registered via `TypeOrmModule.forFeature()`.
 *    - `synchronize: true` automatically aligns the PostgreSQL schema with TypeORM entity definitions in dev mode.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5433),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'ecommerce_dev'),
        autoLoadEntities: true,
        synchronize: true,
        logging: configService.get<string>('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
