# 05. Forms & Zod Validation Parity

Form handling in modern web applications demands responsiveness, runtime type safety, and airtight server-side security. This document details the integration between **React Hook Form** and **Zod**, explores the client-side schemas, and demonstrates strict 1:1 validation parity with NestJS `class-validator` DTOs.

---

## 1. React Hook Form & Zod Integration

### Why React Hook Form + Zod?
- **Uncontrolled Inputs with Controlled Validation**: React Hook Form registers DOM inputs directly via refs (`{...register('fieldName')}`). This avoids re-rendering the entire component tree on every keystroke, keeping form interactions fluid.
- **Decoupled Validation Schemas**: Instead of embedding validation logic directly in JSX, Zod schemas declare data shapes and boundary rules in separate files.
- **The Resolver Bridge**: The `@hookform/resolvers/zod` package bridges Zod and React Hook Form. It parses user inputs through the Zod schema, infers TypeScript types, and formats validation errors for UI display.

### Standard Form Implementation Pattern:
```tsx
// Example: frontend/src/app/checkout/page.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema, CheckoutFormData } from '../../lib/schemas/checkout.schema';
import { useCheckoutMutation } from '../../lib/redux/api/ordersApi';

export function CheckoutForm() {
  const [checkout, { isLoading }] = useCheckoutMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: '',
      shippingAddress: '',
      paymentMethod: 'cod',
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      await checkout({ shippingAddress: data.shippingAddress.trim() }).unwrap();
      // Handle success / redirect to order confirmation
    } catch (err: any) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
        <textarea
          {...register('shippingAddress')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
        />
        {errors.shippingAddress && (
          <p className="mt-1 text-sm text-red-600">{errors.shippingAddress.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
      >
        {isLoading ? 'Processing...' : 'Place Order'}
      </button>
    </form>
  );
}
```

---

## 2. Frontend Zod Schemas (`frontend/src/lib/schemas/`)

The application defines type-safe schemas corresponding to each user action:

### 1. Authentication Schemas (`auth.schema.ts`):
- **`loginSchema`**:
  - `email`: Required, must be a valid email format.
  - `password`: Required non-empty string.
- **`registerSchema`**:
  - `name`: Minimum 2 characters, maximum 100 characters.
  - `email`: Required, valid email format.
  - `password`: Minimum 6 characters.

### 2. Checkout Schema (`checkout.schema.ts`):
- `fullName`: Minimum 2 characters.
- `shippingAddress`: Minimum 5 characters, with a whitespace-rejection refinement (`.refine((val) => val.trim().length >= 5)`).
- `paymentMethod`: Enum `['cod', 'card']`, defaulting to `'cod'`.

### 3. Profile Schema (`profile.schema.ts`):
- `name`: Optional, minimum 2 characters if provided (`.optional().or(z.literal(''))`).
- `address`: Optional, minimum 5 characters if provided (`.optional().or(z.literal(''))`).

### 4. Catalog Filter Schema (`filter.schema.ts`):
- `search`: Optional string.
- `category`: Optional string.
- `minPrice` / `maxPrice`: Coerced numbers with `.min(0)`.
- `sortBy`: Enum `['price_asc', 'price_desc', 'newest', 'name']`.
- `page` / `limit`: Coerced integers with `.default(1)` and `.default(12)`.
- Cross-field refinement: Guarantees `minPrice <= maxPrice`.

---

## 3. Strict 1:1 Validation Parity with NestJS DTOs

In a secure full-stack application, client validation provides immediate user feedback, while server validation enforces security rules. The table below illustrates the exact 1:1 parity between frontend Zod rules and backend NestJS `class-validator` annotations:

| Domain Form | Frontend Zod Schema (`frontend/src/lib/schemas/`) | Backend NestJS DTO (`backend/src/.../dto/`) | Parity Rule Explanation |
|---|---|---|---|
| **Register: Name** | `z.string().min(2).max(100)` | `@IsString()`, `@IsNotEmpty({ message: 'Name cannot be empty' })` | Both enforce non-empty strings; client provides upper bound for UI safety. |
| **Register: Email** | `z.string().min(1).email('Please provide a valid email address')` | `@IsEmail({}, { message: 'Please provide a valid email address' })` | Exact identical error message and RFC email format check. |
| **Register: Password** | `z.string().min(6, 'Password must be at least 6 characters long')` | `@MinLength(6, { message: 'Password must be at least 6 characters long' })` | Exact identical 6-character boundary and error message. |
| **Login: Email** | `z.string().min(1).email('Please provide a valid email address')` | `@IsEmail({}, { message: 'Please provide a valid email address' })` | Exact identical error message and RFC email format check. |
| **Login: Password** | `z.string().min(1, 'Password is required')` | `@IsString()`, `@IsNotEmpty({ message: 'Password is required' })` | Both enforce mandatory non-empty password. |
| **Checkout: Address** | `z.string().min(5).refine((v) => v.trim().length >= 5, 'Shipping address cannot be only whitespace')` | `@IsString()`, `@IsNotEmpty({ message: 'Shipping address is required for checkout' })` | Enforces non-empty string and prevents whitespace-only payloads from reaching database. |
| **Profile: Name** | `z.string().min(2).optional().or(z.literal(''))` | `@IsOptional()`, `@IsString()` | Enables optional partial updates without rejecting empty input fields. |
| **Profile: Address** | `z.string().min(5).optional().or(z.literal(''))` | `@IsOptional()`, `@IsString()` | Enables optional partial updates without rejecting empty input fields. |
| **Filter: minPrice** | `z.coerce.number().min(0, 'Minimum price must be non-negative').optional()` | `@IsOptional()`, `@Type(() => Number)`, `@IsNumber()`, `@Min(0)` | Coerces query string to number; enforces non-negative boundary >= 0. |
| **Filter: maxPrice** | `z.coerce.number().min(0, 'Maximum price must be non-negative').optional()` | `@IsOptional()`, `@Type(() => Number)`, `@IsNumber()`, `@Min(0)` | Coerces query string to number; enforces non-negative boundary >= 0. |
| **Filter: Range** | `.refine((d) => d.minPrice <= d.maxPrice, 'Minimum price cannot be greater than maximum price')` | SQL Query Builder `WHERE price >= :min AND price <= :max` | Client prevents sending inverted price boundaries to database query builder. |
| **Filter: sortBy** | `z.enum(['price_asc', 'price_desc', 'newest', 'name']).optional()` | `@IsOptional()`, `@IsIn(['price_asc', 'price_desc', 'newest', 'name'])` | Strict enum parity; rejects unauthorized SQL sort columns. |
| **Filter: Pagination** | `page: z.coerce.number().int().min(1).default(1)`, `limit: z.coerce.number().int().min(1).default(12)` | `@Type(() => Number)`, `@IsNumber()`, `@Min(1)` | Coerces pagination parameters and enforces 1-based indexing. |

---

## 4. Handling Complex Form Edge Cases

### Edge Case 1: Whitespace Rejection
If a user submits `"     "` as an address, a naive `.min(5)` validation would pass, but the database would receive an empty address. Zod's `.refine()` catches this:
```typescript
// frontend/src/lib/schemas/checkout.schema.ts
export const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  shippingAddress: z
    .string()
    .min(5, 'Shipping address must be at least 5 characters long')
    .refine((val) => val.trim().length >= 5, {
      message: 'Shipping address cannot be only whitespace',
    }),
  paymentMethod: z.enum(['cod', 'card']).default('cod'),
});
```

### Edge Case 2: Cross-Field Relational Bounds
When filtering products, entering a `minPrice` greater than `maxPrice` (e.g. min: $100, max: $20) is semantically invalid. A cross-field refinement binds this check across multiple fields:
```typescript
// frontend/src/lib/schemas/filter.schema.ts
export const filterSchema = z
  .object({
    minPrice: z.coerce.number().min(0, 'Minimum price must be non-negative').optional(),
    maxPrice: z.coerce.number().min(0, 'Maximum price must be non-negative').optional(),
  })
  .refine(
    (data) => {
      if (
        data.minPrice !== undefined &&
        data.maxPrice !== undefined &&
        !isNaN(data.minPrice) &&
        !isNaN(data.maxPrice)
      ) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: 'Minimum price cannot be greater than maximum price',
      path: ['minPrice'],
    },
  );
```

### Edge Case 3: URL Search Parameter Coercion
URL query strings arrive as plain strings (e.g., `"?page=2&minPrice=15.99"`). Zod's `z.coerce.number()` automatically casts the strings into JavaScript numbers before applying numeric boundary checks, ensuring seamless synchronization between browser URLs and form states.
