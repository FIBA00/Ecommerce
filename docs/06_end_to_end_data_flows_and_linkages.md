# 06. End-to-End Data Flows & Educational Linkages

This document provides complete, pedagogical step-by-step traces of the 5 primary user journeys across the full stack: Next.js 14 UI, Redux Toolkit & RTK Query, NestJS 10 controllers/services, TypeORM, and PostgreSQL.

---

## Journey A: User Registration & Cart Provisioning

### 1. Conceptual Overview
When a new customer creates an account, the application must execute several coordinated actions:
1. Validate user input on the client using Zod (`registerSchema`).
2. Dispatch an HTTP `POST` mutation via RTK Query (`authApi.useRegisterMutation`).
3. Validate request payload on the server using NestJS `ValidationPipe` and `RegisterDto`.
4. Check for duplicate accounts in PostgreSQL via TypeORM `userRepository`.
5. Hash the password with `bcryptjs` (10 salt rounds).
6. Insert the new `User` record into the `users` table.
7. Automatically provision an initial empty `Cart` record linked to the user's UUID in the `carts` table.
8. Sign and issue a JSON Web Token (JWT) with user claims (`sub`, `email`, `role`).
9. Return `{ accessToken, user }` to the client.
10. Store credentials in Redux `authSlice` and browser `localStorage`.
11. Invalidate RTK Query cache tags `['Auth', 'Cart', 'Order', 'User']` to prepare fresh state.

### 2. ASCII Flow Diagram

```
[ User in Browser ]
        │  1. Submits registration form (name, email, password)
        ▼
[ RegisterPage Component ] (frontend/src/app/auth/register/page.tsx)
        │  2. Client-side validation via zodResolver(registerSchema)
        ▼
[ authApi.useRegisterMutation ] (frontend/src/lib/redux/api/authApi.ts)
        │  3. HTTP POST /api/auth/register (JSON payload)
        ▼
[ NestJS Global ValidationPipe ]
        │  4. Parses & verifies RegisterDto (backend/src/auth/dto/register.dto.ts)
        ▼
[ AuthController.register() ] (backend/src/auth/auth.controller.ts)
        │  5. Delegates to AuthService.register(registerDto)
        ▼
[ AuthService.register() ] (backend/src/auth/auth.service.ts)
        ├── 6. userRepository.findOne({ email }) -> Throws 409 Conflict if exists
        ├── 7. bcrypt.hash(password, 10)
        ├── 8. userRepository.save(user) ───────────► [ PostgreSQL users table ]
        ├── 9. cartRepository.save(new Cart) ────────► [ PostgreSQL carts table ]
        └── 10. jwtService.sign({ sub, email, role })
        │
        │ 11. Returns { accessToken, user } (HTTP 201 Created)
        ▼
[ authSlice & Redux Store ] (frontend/src/lib/redux/slices/authSlice.ts)
        ├── 12. Stores accessToken & user in Redux state
        ├── 13. Synchronizes to localStorage
        └── 14. RTK Query invalidatesTags: ['Auth', 'Cart', 'Order', 'User']
        │
        │ 15. router.push('/')
        ▼
[ Authenticated App State ] -> Navbar displays user name & active cart badge
```

### 3. Step-by-Step Code Linkage
- **Client Schema**: `frontend/src/lib/schemas/auth.schema.ts`
- **RTK Hook**: `frontend/src/lib/redux/api/authApi.ts` -> `useRegisterMutation()`
- **Backend Controller**: `backend/src/auth/auth.controller.ts` -> `@Post('register')`
- **Backend Service**: `backend/src/auth/auth.service.ts` -> `register()`
- **TypeORM Entities**: `backend/src/users/entities/user.entity.ts` and `backend/src/cart/entities/cart.entity.ts`

---

## Journey B: Product Search, Multi-Facet Filtering & Pagination

### 1. Conceptual Overview
Browsing an ecommerce catalog requires dynamic query composition across multiple dimensions: keyword search, category selection, price range constraints, sort order, and pagination.
1. The user interacts with search inputs or filters in `frontend/src/app/products/page.tsx` and `ProductFilters.tsx`.
2. Filter state updates synchronize with the browser URL query string (`/products?search=...&minPrice=...`).
3. RTK Query hook `useGetProductsQuery(queryParams)` detects parameter changes and constructs the HTTP request.
4. NestJS `ProductsController.getProducts()` receives the query string and parses it into `GetProductsQueryDto`.
5. `ProductsService.findAll()` leverages TypeORM's `SelectQueryBuilder` to dynamically chain SQL `WHERE`, `ORDER BY`, `LIMIT`, and `OFFSET` clauses.
6. PostgreSQL executes the SQL query with index-friendly parameter substitution (`$1, $2, ...`).
7. The service computes total items and pages using `getManyAndCount()`.
8. The response is returned to RTK Query and cached under the `{ type: 'Product', id: 'LIST' }` tag.

### 2. ASCII Flow Diagram

```
[ User Interaction ] (Search bar / Category pill / Price slider)
        │
        ▼
[ ProductFilters / ProductsPage ] (frontend/src/app/products/page.tsx)
        │  1. Serializes filter values into URL query string:
        │     ?search=headphones&category=electronics&minPrice=50&sortBy=price_asc&page=1
        ▼
[ productsApi.useGetProductsQuery ] (frontend/src/lib/redux/api/productsApi.ts)
        │  2. Injects query params into GET /api/products?...
        ▼
[ NestJS ValidationPipe ]
        │  3. Coerces types (strings to numbers/ints) via class-transformer
        ▼
[ ProductsController.getProducts() ] (backend/src/products/products.controller.ts)
        │  4. Delegates query DTO to ProductsService
        ▼
[ ProductsService.findAll() ] (backend/src/products/products.service.ts)
        │  5. Builds TypeORM SelectQueryBuilder:
        │     - leftJoinAndSelect('product.category', 'category')
        │     - andWhere('(LOWER(product.name) LIKE :s OR LOWER(description) LIKE :s)')
        │     - andWhere('(category.id = :c OR category.slug = :c)')
        │     - andWhere('product.price >= :min AND product.price <= :max')
        │     - orderBy('product.price', 'ASC')
        │     - skip(0).take(12)
        ▼
[ PostgreSQL Database ]
        │  6. Executes parameterized SELECT query
        │  7. Returns rows + total count
        ▼
[ Paginated JSON Response ]
        │  { items: Product[], total: 42, page: 1, totalPages: 4 }
        ▼
[ RTK Query Cache ]
        │  8. Caches result under tag: { type: 'Product', id: 'LIST' }
        ▼
[ UI ProductGrid & Pagination Controls ]
        9. Renders responsive cards with live prices, categories, and stock
```

---

## Journey C: Shopping Cart Operations & Tag Invalidation

### 1. Conceptual Overview
A robust cart must guarantee inventory availability, compute accurate financial totals, isolate user carts, and instantly reflect changes across the UI (such as the header badge) without page reloads.
1. The user clicks "Add to Cart" on a product card.
2. RTK Query dispatches `useAddToCartMutation({ productId, quantity })`.
3. `apiSlice.prepareHeaders` attaches the `Authorization: Bearer <token>` header.
4. NestJS `JwtAuthGuard` authenticates the request and extracts the `User` entity via `@CurrentUser()`.
5. `CartService.addItem()` loads the product and validates that requested quantity does not exceed physical warehouse stock (`product.stock >= requestedQuantity`).
6. The service finds or creates the user's cart, checks if the product is already in the cart, and accumulates the quantity while enforcing the stock ceiling.
7. The line item is saved to the `cart_items` table in PostgreSQL.
8. The service computes `cartTotal` (sum of quantity * price) and `itemCount` (sum of quantities).
9. The updated `CartResponse` is returned with HTTP 201 Created.
10. RTK Query catches the successful mutation and triggers `invalidatesTags: ['Cart']`.
11. The global `Navbar` component, which is subscribed to `cartApi.useGetCartQuery()`, detects that tag `Cart` is invalidated, automatically refetches the cart, and updates the badge count in the DOM.

### 2. ASCII Flow Diagram

```
[ ProductCard / ProductDetailPage ]
        │  1. Clicks "Add to Cart" (productId: 'p-1', quantity: 2)
        ▼
[ cartApi.useAddToCartMutation ] (frontend/src/lib/redux/api/cartApi.ts)
        │  2. apiSlice attaches Header: "Authorization: Bearer <JWT>"
        │  3. Dispatches POST /api/cart/items { productId, quantity }
        ▼
[ JwtAuthGuard & CartController ] (backend/src/cart/cart.controller.ts)
        │  4. Validates JWT, extracts currentUser
        ▼
[ CartService.addItem() ] (backend/src/cart/cart.service.ts)
        ├── 5. Queries productRepository -> Checks product.stock >= 2
        ├── 6. getOrCreateCart(userId) -> Finds user's active Cart
        ├── 7. Checks existing cart_items:
        │      accumulatedQuantity = existing.quantity + 2
        │      if (accumulatedQuantity > product.stock) throw BadRequestException
        ├── 8. cartItemRepository.save(item) ───► [ PostgreSQL cart_items table ]
        └── 9. Recalculates cartTotal & itemCount
        │
        │ 10. Returns updated CartResponse { id, items, cartTotal, itemCount }
        ▼
[ RTK Query Cache Invalidation ]
        │  11. Mutation declares: invalidatesTags: ['Cart']
        │  12. RTK Query marks any query providing ['Cart'] as STALE
        ▼
[ Navbar Component ] (frontend/src/components/Navbar.tsx)
        │  13. Subscribed via useGetCartQuery(undefined, { skip: !isAuthenticated })
        │  14. Automatically dispatches background GET /api/cart
        │  15. Receives fresh { itemCount: 2 }
        ▼
[ Reactive UI Update ] -> Navbar cart badge updates from 0 to 2 immediately!
```

---

## Journey D: Atomic Checkout, Inventory Decrement & Snapshotting

### 1. Conceptual Overview
The checkout flow is the most critical transaction in the entire application. It must be strictly ACID-compliant (Atomicity, Consistency, Isolation, Durability) to prevent financial or inventory inconsistencies:
1. The customer enters delivery details in `frontend/src/app/checkout/page.tsx`.
2. Client-side Zod validation verifies that `shippingAddress` contains at least 5 non-whitespace characters.
3. RTK Query dispatches `useCheckoutMutation({ shippingAddress })`.
4. NestJS `OrdersController.checkout()` receives the request under `JwtAuthGuard`.
5. `OrdersService.checkout()` initiates an explicit PostgreSQL transaction using TypeORM's `this.dataSource.transaction(async (manager) => ...)`.
6. Inside the transaction:
   a. **Cart Loading**: Retrieves user's cart with items and live product relations.
   b. **Stock Verification**: Verifies `item.product.stock >= item.quantity` for every item in the cart. If any product is depleted, an exception is thrown, aborting the transaction.
   c. **Inventory Decrement**: Subtracts `item.quantity` from `item.product.stock` and persists the updated product.
   d. **Total Calculation**: Calculates financial order total (`sum(quantity * price)`).
   e. **Order Entity Creation**: Inserts record into `orders` table with status `'pending'`.
   f. **OrderItem Snapshotting**: Creates immutable `order_items` records copying `productTitle` and `price` at this exact moment.
   g. **Cart Purging**: Deletes all line items from `cart_items` for this cart.
7. If any step throws an error, PostgreSQL executes a complete `ROLLBACK`, restoring stock and leaving the cart untouched.
8. Upon successful commit, `OrdersService` returns the created `Order`.
9. RTK Query invalidates `['Cart', 'Order', 'Product']`:
   - `Cart`: Clears cart UI and resets badge to 0.
   - `Order`: Refreshes customer order history list.
   - `Product`: Refetches catalog items so other shoppers immediately see decremented stock!
10. The user is redirected to `/orders/[id]` to inspect their receipt.

### 2. ASCII Flow Diagram

```
[ CheckoutPage Form ] (frontend/src/app/checkout/page.tsx)
        │  1. Validates shipping address with checkoutSchema
        ▼
[ ordersApi.useCheckoutMutation ] (frontend/src/lib/redux/api/ordersApi.ts)
        │  2. POST /api/orders/checkout { shippingAddress }
        ▼
[ OrdersController.checkout ] (backend/src/orders/orders.controller.ts)
        │  3. Protected by JwtAuthGuard, extracts user.id
        ▼
[ OrdersService.checkout ] (backend/src/orders/orders.service.ts)
        │  4. Begins TypeORM Database Transaction:
        │     DataSource.transaction(async (manager) => {
        ▼
 ┌─────────────────────── DATABASE TRANSACTION BOUNDARY ──────────────────────┐
 │                                                                            │
 │  a. manager.findOne(Cart, { relations: ['items', 'items.product'] })       │
 │     └─ Check: Cart is not empty                                            │
 │                                                                            │
 │  b. Stock Verification Loop:                                               │
 │     └─ For each item: if (item.product.stock < item.quantity)              │
 │          throw BadRequestException (Triggers ROLLBACK)                     │
 │                                                                            │
 │  c. Stock Decrement Loop:                                                  │
 │     └─ item.product.stock -= item.quantity                                 │
 │     └─ manager.save(Product, item.product) ───► [ UPDATE products ]        │
 │                                                                            │
 │  d. Create Order:                                                          │
 │     └─ manager.save(Order, { userId, totalAmount, shippingAddress })       │
 │        ───► [ INSERT INTO orders ]                                         │
 │                                                                            │
 │  e. SNAPSHOT Line Items:                                                   │
 │     └─ For each item: create OrderItem with:                               │
 │          productTitle = item.product.name                                  │
 │          price = item.product.price                                        │
 │     └─ manager.save(OrderItem, orderItems) ────► [ INSERT INTO order_items]│
 │                                                                            │
 │  f. Clear Customer Cart:                                                   │
 │     └─ manager.delete(CartItem, { cartId }) ──► [ DELETE FROM cart_items ] │
 │                                                                            │
 └────────────────────────────────────────────────────────────────────────────┘
        │  5. PostgreSQL executes COMMIT
        │  6. Returns complete Order entity with items
        ▼
[ RTK Query Cache Invalidation Matrix ]
        │  7. invalidatesTags: ['Cart', 'Order', 'Product']
        ├── 'Cart' invalidated ───► Navbar badge resets to 0; /cart shows empty
        ├── 'Order' invalidated ──► /orders history list fetches newly created order
        └── 'Product' invalidated ► /products catalog refetches decremented stock
        │
        │ 8. router.push('/orders/' + order.id)
        ▼
[ OrderReceiptPage ] -> Displays immutable invoice and confirmation
```

---

## Journey E: Order History & Immutable Snapshot Retrieval

### 1. Conceptual Overview
In ecommerce, prices fluctuate, product descriptions are updated, and products may be discontinued or deleted altogether. If an invoice simply joined with the `products` table, a price increase would retroactively alter past customer receipts, violating commercial law and accounting integrity.
1. The customer navigates to `/orders` or `/orders/[id]` (`OrderReceiptPage`).
2. RTK Query dispatches `useGetOrderByIdQuery(id)`.
3. NestJS `OrdersController.getOrderById()` invokes `OrdersService.findOne(userId, orderId, userRole)`.
4. The service queries PostgreSQL for the `Order` and its joined `OrderItem` records.
5. Authorization guard: verifies that `order.userId === userId` (or user is `'admin'`). If not, it throws a `ForbiddenException` (HTTP 403), preventing data snooping between customers.
6. The receipt view renders line items by reading `orderItem.productTitle` and `orderItem.price` directly from the `order_items` table.
7. Even if the store administrator modifies the catalog product name or doubles its price tomorrow, this receipt remains 100% frozen in time!

### 2. ASCII Flow Diagram

```
[ User Navigates to /orders/:id ]
        │
        ▼
[ OrderReceiptPage Component ] (frontend/src/app/orders/[id]/page.tsx)
        │  1. useGetOrderByIdQuery(orderId)
        ▼
[ ordersApi.getOrderById ] (frontend/src/lib/redux/api/ordersApi.ts)
        │  2. Injects Authorization: Bearer <token>
        │  3. GET /api/orders/:id
        ▼
[ OrdersController.getOrderById ] (backend/src/orders/orders.controller.ts)
        │  4. Extracts authenticated user from @CurrentUser()
        ▼
[ OrdersService.findOne ] (backend/src/orders/orders.service.ts)
        │  5. orderRepository.findOne({ where: { id }, relations: ['items'] })
        ├── 6. Authorization Check:
        │      if (order.userId !== user.id && user.role !== 'admin') {
        │        throw ForbiddenException('HTTP 403: Not your order');
        │      }
        └── 7. Returns Order with snapshotted items
        ▼
[ PostgreSQL Query Execution ]
        │  SELECT * FROM orders WHERE id = $1;
        │  SELECT * FROM order_items WHERE order_id = $1;
        ▼
[ OrderReceipt UI Table ]
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Snapshotted Title      │ Unit Price │ Qty │ Line Total                 │
   ├────────────────────────┼────────────┼─────┼────────────────────────────┤
   │ Mechanical Keyboard    │ $129.99    │  1  │ $129.99                    │
   │ USB-C Braided Cable    │ $14.99     │  2  │ $29.98                     │
   ├────────────────────────┼────────────┼─────┼────────────────────────────┤
   │ Subtotal               │            │     │ $159.97                    │
   │ Total Paid             │            │     │ $159.97                    │
   └────────────────────────────────────────────────────────────────────────┘
     * Notice: Values are loaded from order_items table, NOT products table!
```

### 3. Snapshotting Data Model Comparison

| Field | In `products` table | In `order_items` table | Purpose of Separation |
|---|---|---|---|
| Name / Title | `name` (Mutable) | `productTitle` (Immutable) | Preserves exact name as seen by shopper when order was placed. |
| Price | `price` (Mutable) | `price` (Immutable) | Guarantees billing accuracy even if product price increases later. |
| Foreign Key | Primary Key `id` | `productId` (`onDelete: 'SET NULL'`) | Prevents receipt deletion if catalog product is permanently removed. |
