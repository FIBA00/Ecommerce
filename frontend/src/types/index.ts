/**
 * [EDUCATIONAL NOTE: Shared TypeScript Domain Types]
 * 
 * 1. Architecture Role:
 *    Central type definitions shared between frontend UI, React Hook Form schemas,
 *    Redux slices, and RTK Query API endpoints.
 * 
 * 2. Full-Stack Linkage:
 *    Directly mirrors NestJS backend entities:
 *    - User <-> backend/src/users/entities/user.entity.ts
 *    - Category <-> backend/src/categories/entities/category.entity.ts
 *    - Product <-> backend/src/products/entities/product.entity.ts
 *    - Cart & CartItem <-> backend/src/cart/entities/cart.entity.ts
 *    - Order & OrderItem <-> backend/src/orders/entities/order.entity.ts
 * 
 * 3. State & Validation Mechanics:
 *    - Strict typing ensures TypeScript compiler verifies DTO compliance across the stack.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    address?: string | null;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
  category?: Category;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export interface GetProductsQueryParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name';
  page?: number;
  limit?: number;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  cartTotal: number;
  itemCount: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  product?: Product | null;
  productTitle: string;
  price: number;
  quantity: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}
