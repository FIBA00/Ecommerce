# 02. Database Architecture & TypeORM Entities

In an ecommerce system, database design dictates data integrity, transactional safety, and financial accuracy. This document details the 7 TypeORM entities in the platform, relational cascades, decimal precision handling, and the critical concept of receipt data snapshotting.

---

## 1. Entity Relationship Diagram (ERD)

```
       +-------------------+
       |     Category      |
       +-------------------+
       | id: UUID (PK)     |
       | name: VARCHAR     |
       | slug: VARCHAR (UQ)|
       | description: TEXT |
       +---------+---------+
                 | 1
                 |
                 | N (CASCADE)
       +---------v---------+                         +-------------------+
       |      Product      |                         |       User        |
       +-------------------+                         +-------------------+
       | id: UUID (PK)     |                         | id: UUID (PK)     |
       | name: VARCHAR     |                         | email: VARCHAR(UQ)|
       | description: TEXT |                         | password: VARCHAR |
       | price: NUMERIC    |<--------+               | name: VARCHAR     |
       | stock: INT        |         |               | role: VARCHAR     |
       | categoryId: UUID  |         |               | address: TEXT     |
       +---------+---------+         |               +----+---------+----+
                 |                   |                    |         |
                 | 1                 | 1 (SET NULL)     1 |         | 1
                 |                   |                    |         |
                 | N (CASCADE)       |                  1 |         | N (CASCADE)
       +---------v---------+   +-----+-------------+ +----v----+ +--v----------------+
       |     CartItem      |   |    OrderItem      | |  Cart   | |      Order       |
       +-------------------+   +-------------------+ +---------+ +-------------------+
       | id: UUID (PK)     |   | id: UUID (PK)     | | id (PK) | | id: UUID (PK)     |
       | cartId: UUID (FK) |   | orderId: UUID (FK)| | userId  | | userId: UUID (FK) |
       | productId: UUID   |   | productId: UUID   | +----+----+ | totalAmount: NUM  |
       | quantity: INT     |   | productTitle: STR |      |      | status: VARCHAR   |
       +---------^---------+   | price: NUMERIC    |      | 1    | shippingAddress   |
                 |             | quantity: INT     |      |      +---------+---------+
                 | N           +---------^---------+      | N              | 1
                 |                       |                | (CASCADE)      | N (CASCADE)
                 +-----------+-----------+                |          +-----v-------------+
                             |                            +--------->|     CartItem      |
                             | (CASCADE)                             +-------------------+
                             |
                     +-------+-------+
                     |     Order     |
                     +---------------+
```

---

## 2. Exhaustive Walkthrough of the 7 TypeORM Entities

### 1. `User` Entity (`users` table)
- **File**: `backend/src/users/entities/user.entity.ts`
- **Fields**:
  - `id`: UUID primary key (`@PrimaryGeneratedColumn('uuid')`).
  - `email`: String, decorated with `@Column({ unique: true })`.
  - `password`: String with `@Column({ select: false })`.  
    *Educational Note*: Setting `select: false` guarantees that whenever `userRepository.find()` or `findOne()` is called, the password hash is excluded from query results by default, preventing accidental leakage in REST API payloads.
  - `name`: String.
  - `role`: Enum `'user' | 'admin'`, defaults to `'user'`.
  - `address`: Nullable text column for default shipping destination.
  - `createdAt` / `updatedAt`: Automatic timestamps.
- **Relations**:
  - `@OneToOne(() => Cart)`: Each user has exactly one persistent shopping cart.
  - `@OneToMany(() => Order)`: A user can place multiple historic orders.

### 2. `Category` Entity (`categories` table)
- **File**: `backend/src/categories/entities/category.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `name`: Category label (e.g., "Electronics").
  - `slug`: Unique human-readable URL slug (e.g., "electronics"). Decorated with `@Column({ unique: true })`.
  - `description`: Optional text describing the category.
- **Relations**:
  - `@OneToMany(() => Product)`: One category groups multiple products.

### 3. `Product` Entity (`products` table)
- **File**: `backend/src/products/entities/product.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `name`: Product title.
  - `description`: Detailed markdown or text description.
  - `price`: Numeric currency value using the **Decimal Transformer** (see Section 3).
  - `stock`: Integer representing available warehouse stock (`default: 0`).
  - `imageUrl`: Public HTTPS image asset URL.
  - `categoryId`: Foreign key referencing `categories.id`.
- **Relations**:
  - `@ManyToOne(() => Category)` with `onDelete: 'CASCADE'`.

### 4. `Cart` Entity (`carts` table)
- **File**: `backend/src/cart/entities/cart.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `userId`: Foreign key with `@Column({ type: 'uuid', unique: true })`. Enforces a 1-to-1 relationship at the database level.
- **Relations**:
  - `@OneToOne(() => User)` with `onDelete: 'CASCADE'`.
  - `@OneToMany(() => CartItem)` with `{ cascade: true }`.

### 5. `CartItem` Entity (`cart_items` table)
- **File**: `backend/src/cart/entities/cart-item.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `cartId`: Foreign key referencing parent `Cart`.
  - `productId`: Foreign key referencing merchandise `Product`.
  - `quantity`: Integer (min 1).
- **Relations**:
  - `@ManyToOne(() => Cart)` with `onDelete: 'CASCADE'`.
  - `@ManyToOne(() => Product, { eager: true, onDelete: 'CASCADE' })`.  
    *Educational Note*: Setting `eager: true` ensures that when a cart is loaded, current product details (live price, current title, thumbnail) are automatically joined in a single SQL query.

### 6. `Order` Entity (`orders` table)
- **File**: `backend/src/orders/entities/order.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `userId`: Foreign key referencing ordering user.
  - `totalAmount`: Decimal monetary sum of all purchased items.
  - `status`: Lifecycle state enum: `'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'`.
  - `shippingAddress`: Plain text snapshot of customer delivery address.
- **Relations**:
  - `@ManyToOne(() => User)` with `onDelete: 'CASCADE'`.
  - `@OneToMany(() => OrderItem, (item) => item.order, { cascade: true })`.

### 7. `OrderItem` Entity (`order_items` table)
- **File**: `backend/src/orders/entities/order-item.entity.ts`
- **Fields**:
  - `id`: UUID primary key.
  - `orderId`: Foreign key referencing parent `Order`.
  - `productId`: Nullable UUID referencing original catalog item.
  - `productTitle`: **Snapshotted** string of the product name at checkout.
  - `price`: **Snapshotted** numeric unit price at checkout.
  - `quantity`: Integer units purchased.
- **Relations**:
  - `@ManyToOne(() => Order)` with `onDelete: 'CASCADE'`.
  - `@ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })`.

---

## 3. The Decimal Transformer Pattern: Preventing Floating-Point Hazards

### The Problem in JavaScript & PostgreSQL:
In PostgreSQL, monetary figures are stored using the `numeric` or `decimal` data type (e.g., `numeric(10,2)`). When the node-postgres (`pg`) driver receives a numeric column from PostgreSQL, it returns it as a JavaScript **`string`** (e.g., `"249.99"`).
The `pg` driver does this intentionally because JavaScript numbers are 64-bit IEEE 754 floats. Converting arbitrary-precision database decimals directly to floats could cause silent precision loss.

However, in TypeScript application code, developers expect `product.price` or `order.totalAmount` to be a `number` so they can format, calculate totals, and perform arithmetic without constant manual `parseFloat()` calls.

### The TypeORM Transformer Solution:
We attach a custom Column transformer to all decimal fields:

```typescript
@Column({
  type: 'decimal',
  precision: 10,
  scale: 2,
  transformer: {
    // When writing to PostgreSQL: save number directly
    to: (value: number) => value,
    // When reading from PostgreSQL: parse SQL string into JavaScript number
    from: (value: string | number) => Number(value),
  },
})
price: number;
```

### Benefits:
1. **Type Safety**: TypeScript interface `product.price: number` matches runtime truth.
2. **Clean JSON Serialization**: The REST API returns `{ "price": 249.99 }` as a JSON number rather than `"{ "price": "249.99" }"`, simplifying frontend RTK Query consumers.

---

## 4. Crucial Architectural Concept: Receipt Data Snapshotting

One of the most dangerous bugs in naive ecommerce systems is **live price referencing on past orders**.

### The Anti-Pattern:
```sql
-- ANTI-PATTERN: Joining live product table to calculate historical order receipts
SELECT o.id, p.name, p.price, oi.quantity 
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id;
```
### Why This Fails in Production:
1. If a merchant increases a product's price next month from $100 to $150, all customers who purchased it last month will suddenly see their past receipts jump from $100 to $150!
2. If a merchant deletes a discontinued product from the catalog, the join fails or deletes historical order records via cascade.
3. Accounting, tax records, and legal sales receipts are completely corrupted.

### The Snapshotting Solution:
In our platform, `OrderItem` explicitly decouples from the live product attributes:

```typescript
@Entity('order_items')
export class OrderItem {
  // 1. Relational reference is nullable with ON DELETE SET NULL
  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  // 2. Frozen snapshot of the product name at the second of checkout
  @Column()
  productTitle: string;

  // 3. Frozen snapshot of the exact unit price paid
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  price: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;
}
```

### Relational Cascade Matrix:
| Parent Entity Action | Child Entity | Foreign Key Action | Educational Significance |
|---|---|---|---|
| User is Deleted | Cart | `ON DELETE CASCADE` | Ephemeral shopping cart is discarded with user account. |
| User is Deleted | Orders | `ON DELETE CASCADE` | Orders tied to user account are cleaned up (or archived in production). |
| Cart is Deleted | CartItems | `ON DELETE CASCADE` | Clearing a cart cleanly wipes all ephemeral line items. |
| Product is Deleted | CartItems | `ON DELETE CASCADE` | Discontinued product is automatically removed from active shopping carts. |
| **Product is Deleted** | **OrderItems** | **`ON DELETE SET NULL`** | **Historical receipts remain 100% intact with frozen title & price.** |
