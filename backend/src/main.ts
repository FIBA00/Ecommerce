/**
 * [EDUCATIONAL NOTE: NestJS Bootstrap & Main Entry Point]
 * 
 * 1. Architecture Role:
 *    Initializes and boots the NestJS Express HTTP application.
 * 
 * 2. Key Middleware & Global Pipelines:
 *    - Global Route Prefix: Sets `/api` across all controllers, standardizing the REST API base path.
 *    - CORS: Configured with origin `http://localhost:3000` (Next.js frontend) and credentials support.
 *    - Global ValidationPipe:
 *      - `whitelist: true`: Automatically strips undeclared properties from request payloads (prevents mass-assignment attacks).
 *      - `transform: true`: Automatically converts incoming payloads to DTO class instances and applies parameter typing.
 *    - Dynamic Port: Reads `PORT` from environment (defaulting to 3001) to coexist seamlessly with Next.js (port 3000).
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // 1. Configure Global Route Prefix
  app.setGlobalPrefix('api');

  // 2. Configure Cross-Origin Resource Sharing (CORS) for Next.js frontend
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Attach Global Request Validation & Type Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(port);
  console.log(`🚀 NestJS Ecommerce API running at: http://localhost:${port}/api`);
}

bootstrap();
