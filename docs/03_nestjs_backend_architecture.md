# 03. NestJS Backend Architecture & Service Patterns

NestJS is a progressive Node.js framework that brings scalable, enterprise-grade architecture patterns—such as Inversion of Control (IoC), Dependency Injection (DI), and modular encapsulation—to the server side. This document dissects the architecture of our ecommerce backend.

---

## 1. Architectural Paradigms: Modules, Providers, and Dependency Injection

NestJS organizes code into cohesive **Modules**. A module bundles related controllers (HTTP request listeners) and providers (services containing business logic).

```
                      +-------------------+
                      |     AppModule     | (Root Module)
                      +---------+---------+
                                |
       +------------+-----------+-----------+------------+
       |            |           |           |            |
+------v-----+ +----v-----+ +---v----+ +----v----+ +-----v----+
| AuthModule | |ProductsM | | CartM  | | OrdersM | | UsersM   | ...
+------+-----+ +----+-----+ +---+----+ +----+----+ +-----+----+
       |            |           |           |            |
       v            v           v           v            v
  Controllers  Controllers Controllers Controllers  Controllers
       │            │           │           │            │
       ▼            ▼           ▼           ▼            ▼
   Services     Services    Services    Services     Services
       │            │           │           │            │
       └────────────┴─────┬─────┴───────────┴────────────┘
                          ▼
             TypeORM Injected Repositories
                          │
                          ▼
                  PostgreSQL Database
```

### Dependency Injection in Action:
Instead of manually instantiating classes with `new Service()`, NestJS uses an IoC container to inject dependencies through class constructors:

```typescript
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  // NestJS DI resolves and injects CartService automatically
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user.id);
  }
}
```

---

## 2. Application Bootstrap & Global Pipelines (`main.ts`)

The application entry point is `backend/src/main.ts`:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // 1. Standardize base URL
  app.setGlobalPrefix('api');

  // 2. Configure CORS for Next.js frontend
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Attach Global Request Validation & Whitelisting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Automatically strip undeclared payload properties
      transform: true,        // Automatically instantiate and cast to DTO classes
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(port);
}
```

### The Security & Sanitization Role of `ValidationPipe`:
1. **Mass-Assignment Defense (`whitelist: true`)**:  
   If an attacker submits extra parameters (e.g., `{ "role": "admin" }` on the registration endpoint), `ValidationPipe` automatically strips them before the payload reaches the controller handler.
2. **Type Coercion (`transform: true`)**:  
   HTTP query parameters arrive as strings (e.g., `?page=2&limit=10`). `transform: true` uses `class-transformer` and `@Type(() => Number)` annotations in DTOs to automatically convert strings to numbers.

---

## 3. Feature Modules Overview

| Module | Route Base | Responsibilities | Key Dependencies |
|---|---|---|---|
| **`AuthModule`** | `/api/auth` | User registration, credential login, password hashing, JWT generation, `/me` profile endpoint. | `JwtModule`, `PassportModule`, `TypeOrmModule([User, Cart])` |
| **`UsersModule`** | `/api/users` | Profile retrieval, shipping address updates. | `TypeOrmModule([User])`, `AuthModule` |
| **`CategoriesModule`**| `/api/categories` | Listing product categories sorted alphabetically. | `TypeOrmModule([Category])` |
| **`ProductsModule`** | `/api/products` | Dynamic search, category slug/UUID filtering, price bounds, sorting, pagination, details view. | `TypeOrmModule([Product])` |
| **`CartModule`** | `/api/cart` | Cart retrieval, adding items, updating quantities, removing items, clearing cart. Enforces stock limits. | `TypeOrmModule([Cart, CartItem, Product])`, `AuthModule` |
| **`OrdersModule`** | `/api/orders` | Atomic transactional checkout, stock decrementing, receipt snapshotting, order history. | `TypeOrmModule([Order, Cart])`, `DataSource`, `AuthModule` |

---

## 4. Authentication & Security Architecture

The authentication pipeline combines **Passport JWT Strategy**, **Route Guards**, and a **Custom Parameter Decorator**.

```
Client HTTP Request
  │  Header: "Authorization: Bearer <token>"
  ▼
JwtAuthGuard (Route Guard)
  │  Validates presence of token
  ▼
JwtStrategy (Passport Strategy)
  │  Verifies signature with JWT_SECRET
  │  Decodes payload: { sub: userId, email, role }
  │  Loads User from database
  │  Attaches User to request object: req.user
  ▼
@CurrentUser() Decorator
  │  Extracts req.user cleanly in Controller method
  ▼
Controller Handler Execution
```

### 1. `JwtStrategy` (`backend/src/auth/jwt.strategy.ts`):
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'supersecretjwtkey12345'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }
    return user;
  }
}
```

### 2. Custom `@CurrentUser()` Decorator:
Provides clean, declarative parameter injection without accessing raw Express `req` objects:
```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
```

### 3. Password Security:
Passwords are salted and hashed using `bcryptjs` with a work factor of 10. The `password` column is configured with `{ select: false }` to prevent accidental inclusion in SQL select queries. During authentication, `AuthService.login` explicitly uses QueryBuilder to select the hash:
```typescript
const user = await this.userRepository
  .createQueryBuilder('user')
  .addSelect('user.password')
  .where('user.email = :email', { email: loginDto.email.toLowerCase().trim() })
  .getOne();
```

---

## 5. Transactional Integrity: Checkout in `OrdersService`

The checkout process spans multiple database operations across multiple tables. To guarantee that an order is never created without stock being decremented, and stock is never lost if order creation fails, `OrdersService.checkout` wraps the entire workflow in an ACID transaction:

```typescript
async checkout(userId: string, checkoutDto: CheckoutDto): Promise<Order> {
  return this.dataSource.transaction(async (manager) => {
    // 1. Fetch user's cart with live product details
    const cart = await manager.findOne(Cart, {
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot checkout: cart is empty');
    }

    // 2. Validate warehouse stock for each line item
    for (const item of cart.items) {
      if (!item.product) {
        throw new BadRequestException('A product in your cart is no longer available');
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${item.product.stock}, requested: ${item.quantity}.`,
        );
      }
    }

    // 3. Decrement stock for each product
    for (const item of cart.items) {
      item.product.stock -= item.quantity;
      await manager.save(Product, item.product);
    }

    // 4. Calculate total amount
    const totalAmount = Number(
      cart.items
        .reduce((sum, item) => sum + item.quantity * Number(item.product.price), 0)
        .toFixed(2),
    );

    // 5. Persist parent Order record
    const order = manager.create(Order, {
      userId,
      totalAmount,
      status: 'pending',
      shippingAddress: checkoutDto.shippingAddress.trim(),
    });
    const savedOrder = await manager.save(Order, order);

    // 6. SNAPSHOT items: freeze current product name and current price
    const orderItems = cart.items.map((item) =>
      manager.create(OrderItem, {
        orderId: savedOrder.id,
        productId: item.productId,
        productTitle: item.product.name,
        price: Number(item.product.price),
        quantity: item.quantity,
      }),
    );
    await manager.save(OrderItem, orderItems);

    // 7. Clear ephemeral cart items
    await manager.delete(CartItem, { cartId: cart.id });

    // 8. Return saved order with snapshotted items
    return manager.findOne(Order, {
      where: { id: savedOrder.id },
      relations: ['items'],
    });
  });
}
```

If an error or network disconnection occurs at any point in steps 1 through 7, PostgreSQL automatically rolls back all changes, ensuring zero database corruption or inventory loss.
