/**
 * [EDUCATIONAL NOTE: NestJS ProductsController]
 * 
 * 1. Architecture Role:
 *    Exposes product catalog endpoints at `/api/products`.
 * 
 * 2. Full-Stack Linkage (Next.js / RTK Query):
 *    - `GET /api/products`     -> `productsApi.useGetProductsQuery(filters)`
 *    - `GET /api/products/:id` -> `productsApi.useGetProductByIdQuery(id)`
 * 
 * 3. Validation:
 *    - Query parameters are automatically validated and transformed by `ValidationPipe`.
 */

import { Controller, Get, Param, Query, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ProductsService } from './products.service';
import { GetProductsQueryDto } from './dto/get-products-query.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getProducts(@Query() query: GetProductsQueryDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  async getProductById(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }))
    id: string,
  ) {
    return this.productsService.findOne(id);
  }
}
