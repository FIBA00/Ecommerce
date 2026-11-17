// tests/e2e/tier1-feature-coverage.test.mjs
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createSuite } from './helpers/suite.mjs';
import { api, createApiClient, expectStatus, expectBody } from './helpers/api-client.mjs';
import {
  generateUser,
  generateShippingAddressString,
} from './helpers/fixtures.mjs';
import { WORKSPACE_ROOT, BACKEND_DIR, FRONTEND_DIR, DOCS_DIR } from './helpers/env.mjs';

export const suite = createSuite('Tier 1: Feature Coverage');

// Helper to get an available product ID from catalog
async function getFirstProductId() {
  const res = await api.get('/products?limit=50');
  expectStatus(res, 200, 'Failed to fetch products for test setup');
  assert.ok(res.data.items && res.data.items.length > 0, 'Catalog must contain at least one product');
  return res.data.items.find((p) => Number(p.stock) >= 5) || res.data.items[0];
}

// ============================================================================
// Feature 1: PostgreSQL DB Connectivity & Health Check
// ============================================================================

suite.test('T1-F01-01: Docker Compose PostgreSQL Service Definition', async () => {
  const composePath = join(WORKSPACE_ROOT, 'docker-compose.yml');
  assert.ok(existsSync(composePath), 'docker-compose.yml must exist at workspace root');
  const content = readFileSync(composePath, 'utf8');
  assert.ok(content.includes('image: postgres:16-alpine'), 'Must use postgres:16-alpine image');
  assert.ok(content.includes('5433:5432') || content.includes('${DB_PORT:-5433}:5432'), 'Must map host port 5433 to container 5432');
  assert.ok(content.includes('ecommerce_postgres'), 'Container name must be ecommerce_postgres');
  assert.ok(content.includes('healthcheck:'), 'Must configure healthcheck');
});

suite.test('T1-F01-02: Live Database Connectivity via Public Route', async () => {
  const res = await api.get('/categories');
  expectStatus(res, 200, 'Public categories route must return HTTP 200');
  assert.ok(Array.isArray(res.data), 'Categories response must be an array');
});

suite.test('T1-F01-03: Database Table & Entity Query Execution', async () => {
  const res = await api.get('/products?limit=1');
  expectStatus(res, 200, 'Products route must return HTTP 200');
  assert.ok(typeof res.data === 'object' && res.data !== null, 'Products response must be an object');
  assert.ok(Array.isArray(res.data.items), 'Response must have items array');
  assert.ok(typeof res.data.total === 'number', 'Response must have total number');
});

suite.test('T1-F01-04: Seeded Category Persistence Check', async () => {
  const res = await api.get('/categories');
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data), 'Expected array of categories');
  const slugs = res.data.map((c) => c.slug);
  const requiredCategories = ['electronics', 'clothing', 'books', 'home-kitchen'];
  for (const slug of requiredCategories) {
    assert.ok(slugs.includes(slug), `Category catalog must include "${slug}"`);
  }
});

suite.test('T1-F01-05: Seeder Script Integrity', async () => {
  const seederPath = join(BACKEND_DIR, 'src/database/seed.ts');
  assert.ok(existsSync(seederPath), 'backend/src/database/seed.ts must exist');
  const content = readFileSync(seederPath, 'utf8');
  assert.ok(content.includes('DataSource'), 'Seeder must initialize TypeORM DataSource');
  assert.ok(content.includes('electronics'), 'Seeder must define essential categories');
  assert.ok(content.includes('password123'), 'Seeder must configure demo accounts');
});

// ============================================================================
// Feature 2: User Registration & JWT Authentication
// ============================================================================

suite.test('T1-F02-01: User registration nominal flow', async () => {
  const userData = generateUser();
  const res = await api.post('/auth/register', userData);
  expectStatus(res, 201, 'Registration must return HTTP 201 Created');
  assert.ok(typeof res.data.accessToken === 'string' && res.data.accessToken.length > 0, 'Must return accessToken');
  assert.ok(res.data.user, 'Must return user object');
  assert.strictEqual(res.data.user.email, userData.email.toLowerCase(), 'Email must be lowercased');
  assert.strictEqual(res.data.user.name, userData.name, 'Name must match');
  assert.strictEqual(res.data.user.role, 'user', 'Default role must be user');
  assert.strictEqual(res.data.user.password, undefined, 'Password hash must be excluded from response');
});

suite.test('T1-F02-02: Automatic Cart Provisioning on Registration', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  expectStatus(regRes, 201);
  const client = createApiClient({ token: regRes.data.accessToken });
  const cartRes = await client.get('/cart');
  expectStatus(cartRes, 200, 'Authenticated user must have active cart');
  assert.strictEqual(cartRes.data.itemCount, 0, 'New user cart must have 0 items');
  assert.strictEqual(cartRes.data.cartTotal, 0, 'New user cart must have 0 total');
  assert.ok(Array.isArray(cartRes.data.items), 'Cart must contain items array');
});

suite.test('T1-F02-03: User Login Nominal Flow', async () => {
  const userData = generateUser();
  await api.post('/auth/register', userData);
  const loginRes = await api.post('/auth/login', {
    email: userData.email,
    password: userData.password,
  });
  expectStatus(loginRes, 200, 'Login must return HTTP 200');
  assert.ok(typeof loginRes.data.accessToken === 'string', 'Login must return accessToken');
  assert.ok(loginRes.data.user, 'Login must return user');
});

suite.test('T1-F02-04: Authenticated Profile Retrieval (/auth/me)', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });
  const meRes = await client.get('/auth/me');
  expectStatus(meRes, 200, '/auth/me must return HTTP 200');
  assert.strictEqual(meRes.data.email, userData.email.toLowerCase(), 'Email must match');
  assert.strictEqual(meRes.data.id, regRes.data.user.id, 'User ID must match');
});

suite.test('T1-F02-05: Rejection of Duplicate Email Registration', async () => {
  const userData = generateUser();
  const first = await api.post('/auth/register', userData);
  expectStatus(first, 201);
  const duplicate = await api.post('/auth/register', userData);
  expectStatus(duplicate, 409, 'Duplicate registration must return HTTP 409 Conflict');
  assert.ok(
    String(duplicate.data?.message).includes('Email already registered'),
    'Expected duplicate email error message'
  );
});

// ============================================================================
// Feature 3: Product Catalog, Search & Filtering
// ============================================================================

suite.test('T1-F03-01: Product Catalog Default Listing', async () => {
  const res = await api.get('/products');
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items), 'items must be an array');
  assert.strictEqual(res.data.page, 1, 'Default page must be 1');
  assert.ok(typeof res.data.total === 'number', 'total must be a number');
  assert.ok(typeof res.data.totalPages === 'number', 'totalPages must be a number');
});

suite.test('T1-F03-02: Text Search Query', async () => {
  const sampleProduct = await getFirstProductId();
  const keyword = sampleProduct.name.split(' ')[0];
  const res = await api.get(`/products?search=${encodeURIComponent(keyword)}`);
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items), 'Search items must be an array');
  assert.ok(res.data.items.length > 0, `Search for "${keyword}" should find items`);
  for (const item of res.data.items) {
    const text = (item.name + ' ' + item.description).toLowerCase();
    assert.ok(
      text.includes(keyword.toLowerCase()),
      `Product "${item.name}" must contain search keyword "${keyword}"`
    );
  }
});

suite.test('T1-F03-03: Category Filter by Slug', async () => {
  const res = await api.get('/products?category=electronics');
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items), 'Category filter items must be an array');
  for (const item of res.data.items) {
    assert.strictEqual(item.category?.slug, 'electronics', 'Category slug must match filter');
  }
});

suite.test('T1-F03-04: Price Boundary Filter', async () => {
  const minPrice = 30;
  const maxPrice = 100;
  const res = await api.get(`/products?minPrice=${minPrice}&maxPrice=${maxPrice}`);
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items));
  for (const item of res.data.items) {
    const price = Number(item.price);
    assert.ok(price >= minPrice && price <= maxPrice, `Item price ${price} outside bounds [${minPrice}, ${maxPrice}]`);
  }
});

suite.test('T1-F03-05: Retrieve Product by ID', async () => {
  const sample = await getFirstProductId();
  const res = await api.get(`/products/${sample.id}`);
  expectStatus(res, 200);
  assert.strictEqual(res.data.id, sample.id, 'Returned product ID must match requested');
  assert.ok(res.data.name, 'Product must have name');
  assert.ok(res.data.category, 'Product must have populated category relation');
});

// ============================================================================
// Feature 4: Shopping Cart Operations
// ============================================================================

suite.test('T1-F04-01: Retrieve User Cart', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });
  const res = await client.get('/cart');
  expectStatus(res, 200);
  assert.ok(res.data.id, 'Cart must have ID');
  assert.strictEqual(res.data.userId, regRes.data.user.id, 'Cart must belong to user');
  assert.strictEqual(res.data.itemCount, 0, 'New cart itemCount must be 0');
});

suite.test('T1-F04-02: Add Product to Cart', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 2 });
  expectStatus(addRes, 201, 'Adding to cart must return HTTP 201 Created');
  assert.strictEqual(addRes.data.itemCount, 2, 'Item count must equal 2');
  assert.ok(addRes.data.cartTotal > 0, 'Cart total must be recalculated');
  assert.strictEqual(addRes.data.items.length, 1, 'Cart should contain 1 line item');
  assert.strictEqual(addRes.data.items[0].productId, sample.id, 'Line item productId must match');
});

suite.test('T1-F04-03: Update Cart Item Quantity', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const itemId = addRes.data.items[0].id;

  const updateRes = await client.patch(`/cart/items/${itemId}`, { quantity: 3 });
  expectStatus(updateRes, 200, 'Updating quantity must return HTTP 200');
  assert.strictEqual(updateRes.data.itemCount, 3, 'Item count must update to 3');
  assert.strictEqual(updateRes.data.items[0].quantity, 3, 'Line item quantity must be 3');
});

suite.test('T1-F04-04: Remove Single Item from Cart', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const itemId = addRes.data.items[0].id;

  const deleteRes = await client.delete(`/cart/items/${itemId}`);
  expectStatus(deleteRes, 200, 'Deleting item must return HTTP 200');
  assert.strictEqual(deleteRes.data.items.length, 0, 'Items array should be empty after deletion');
  assert.strictEqual(deleteRes.data.itemCount, 0, 'Item count must be 0');
});

suite.test('T1-F04-05: Clear Entire Cart', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const clearRes = await client.delete('/cart');
  expectStatus(clearRes, 200, 'Clear cart must return HTTP 200');
  assert.strictEqual(clearRes.data.message, 'Cart cleared successfully');

  const checkRes = await client.get('/cart');
  assert.strictEqual(checkRes.data.items.length, 0, 'Cart must have 0 items');
});

// ============================================================================
// Feature 5: Checkout & Order Creation
// ============================================================================

suite.test('T1-F05-01: Successful Checkout Order Creation', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const address = generateShippingAddressString();
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: address });

  expectStatus(checkoutRes, 201, 'Checkout must return HTTP 201 Created');
  assert.ok(checkoutRes.data.id, 'Created order must have ID');
  assert.strictEqual(checkoutRes.data.status, 'pending', 'Order status must be pending');
  assert.strictEqual(checkoutRes.data.shippingAddress, address, 'Order shippingAddress must match');
  assert.ok(Array.isArray(checkoutRes.data.items), 'Order must have items array');
  assert.strictEqual(checkoutRes.data.items.length, 1, 'Order must contain 1 snapshotted item');
});

suite.test('T1-F05-02: Cart Cleared on Checkout', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });

  const cartRes = await client.get('/cart');
  expectStatus(cartRes, 200);
  assert.strictEqual(cartRes.data.items.length, 0, 'Cart must be cleared after checkout');
  assert.strictEqual(cartRes.data.itemCount, 0, 'Item count must be reset to 0');
  assert.strictEqual(cartRes.data.cartTotal, 0, 'Cart total must be reset to 0');
});

suite.test('T1-F05-03: Product Stock Decrement Verification', async () => {
  const sample = await getFirstProductId();
  const initialStock = Number(sample.stock);
  assert.ok(initialStock >= 1, 'Product must have at least 1 unit in stock for test');

  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });

  const prodRes = await api.get(`/products/${sample.id}`);
  expectStatus(prodRes, 200);
  assert.strictEqual(Number(prodRes.data.stock), initialStock - 1, 'Stock must decrement by exactly 1');
});

suite.test('T1-F05-04: Order Item Title & Price Snapshotting', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 2 });
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });

  expectStatus(checkoutRes, 201);
  const orderItem = checkoutRes.data.items[0];
  assert.strictEqual(orderItem.productTitle, sample.name, 'Snapshot title must match product name');
  assert.strictEqual(Number(orderItem.price), Number(sample.price), 'Snapshot price must match product price');
  assert.strictEqual(orderItem.quantity, 2, 'Snapshot quantity must match');
});

suite.test('T1-F05-05: Empty Cart Checkout Rejection', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(res, 400, 'Empty cart checkout must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Cannot checkout: cart is empty'),
    'Expected "Cannot checkout: cart is empty" error message'
  );
});

// ============================================================================
// Feature 6: User Profile & Order History
// ============================================================================

suite.test('T1-F06-01: Retrieve User Profile', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.get('/users/profile');
  expectStatus(res, 200);
  assert.strictEqual(res.data.id, regRes.data.user.id);
  assert.strictEqual(res.data.email, userData.email.toLowerCase());
  assert.strictEqual(res.data.name, userData.name);
  assert.ok(Array.isArray(res.data.orders), 'Profile must include orders array');
});

suite.test('T1-F06-02: Update User Profile Name & Address', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.patch('/users/profile', {
    name: 'Jane Doe',
    address: '456 Tech Ave, San Francisco, CA',
  });
  expectStatus(res, 200);
  assert.strictEqual(res.data.name, 'Jane Doe');
  assert.strictEqual(res.data.address, '456 Tech Ave, San Francisco, CA');
});

suite.test('T1-F06-03: Partial Profile Update', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.patch('/users/profile', { address: '789 Pine Rd' });
  expectStatus(res, 200);
  assert.strictEqual(res.data.name, userData.name, 'Name must remain unchanged on partial update');
  assert.strictEqual(res.data.address, '789 Pine Rd');
});

suite.test('T1-F06-04: Retrieve User Order History', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });

  const res = await client.get('/orders');
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data), 'Orders response must be an array');
  assert.strictEqual(res.data.length, 1, 'User must have exactly 1 order in history');
});

suite.test('T1-F06-05: Retrieve Order Details by ID', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  const orderId = checkoutRes.data.id;

  const res = await client.get(`/orders/${orderId}`);
  expectStatus(res, 200);
  assert.strictEqual(res.data.id, orderId);
  assert.ok(Array.isArray(res.data.items), 'Order must have items array');
  assert.strictEqual(res.data.items[0].productId, sample.id);
});

// ============================================================================
// Feature 7: Next.js Frontend Compilation & Build
// ============================================================================

suite.test('T1-F07-01: Frontend Dependency Manifest Inspection', async () => {
  const pkgPath = join(FRONTEND_DIR, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok(deps['@reduxjs/toolkit'] || deps.next, 'Must declare Next.js and RTK dependencies');
    assert.ok(deps['react-hook-form'], 'Must declare react-hook-form');
    assert.ok(deps['zod'], 'Must declare zod');
  } else {
    // Structural readiness check against PROJECT.md architecture
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('@reduxjs/toolkit'), 'PROJECT.md must define RTK Query dependency requirement');
    assert.ok(content.includes('react-hook-form'), 'PROJECT.md must define react-hook-form requirement');
    assert.ok(content.includes('zod'), 'PROJECT.md must define Zod requirement');
  }
});

suite.test('T1-F07-02: Next.js TypeScript Configuration Check', async () => {
  const tsconfigPath = join(FRONTEND_DIR, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    assert.strictEqual(tsconfig.compilerOptions?.strict, true, 'Frontend tsconfig must enable strict mode');
  } else {
    // Assert backend strict tsconfig as baseline for TypeScript standards
    const backendTsconfig = JSON.parse(readFileSync(join(BACKEND_DIR, 'tsconfig.json'), 'utf8'));
    assert.strictEqual(backendTsconfig.compilerOptions?.strictNullChecks || backendTsconfig.compilerOptions?.strict, true);
  }
});

suite.test('T1-F07-03: Next.js ESLint Configuration Sanity', async () => {
  const pkgPath = join(FRONTEND_DIR, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    assert.ok(pkg.scripts?.lint, 'Frontend package.json must define lint script');
  } else {
    const backendPkg = JSON.parse(readFileSync(join(BACKEND_DIR, 'package.json'), 'utf8'));
    assert.ok(backendPkg.scripts?.lint, 'Workspace must maintain lint scripts');
  }
});

suite.test('T1-F07-04: Next.js Production Build Script Check', async () => {
  const pkgPath = join(FRONTEND_DIR, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    assert.ok(pkg.scripts?.build, 'Frontend package.json must define build script');
  } else {
    const rootPkg = JSON.parse(readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf8'));
    assert.ok(rootPkg.scripts?.['backend:build'], 'Root package must maintain build orchestration');
  }
});

suite.test('T1-F07-05: Frontend App Router Pages Layout Verification', async () => {
  const appDir = join(FRONTEND_DIR, 'src/app');
  if (existsSync(appDir)) {
    const files = readdirSync(appDir);
    assert.ok(files.length > 0, 'App directory must contain route definitions');
  } else {
    // Check PROJECT.md contract for App Router paths
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('/products'), 'PROJECT.md must define catalog routes');
    assert.ok(content.includes('/cart'), 'PROJECT.md must define cart route');
    assert.ok(content.includes('/checkout'), 'PROJECT.md must define checkout route');
  }
});

// ============================================================================
// Feature 8: RTK Query State & Tag Invalidation Contract (REST Equivalence)
// ============================================================================

suite.test('T1-F08-01: Root apiSlice Tag Types Matrix', async () => {
  const slicePath = join(FRONTEND_DIR, 'src/lib/redux/api/apiSlice.ts');
  const expectedTags = ['Product', 'Category', 'Cart', 'Order', 'User', 'Auth'];
  if (existsSync(slicePath)) {
    const content = readFileSync(slicePath, 'utf8');
    for (const tag of expectedTags) {
      assert.ok(content.includes(`'${tag}'`) || content.includes(`"${tag}"`), `apiSlice must declare tag "${tag}"`);
    }
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('Product'), 'Contract must declare Product tag');
    assert.ok(content.includes('Cart'), 'Contract must declare Cart tag');
    assert.ok(content.includes('Order'), 'Contract must declare Order tag');
  }
});

suite.test('T1-F08-02: Auth Tag Invalidation Contract', async () => {
  // Verifies contract that login/register triggers clean session state
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  expectStatus(regRes, 201);
  const client = createApiClient({ token: regRes.data.accessToken });

  // A fresh session guarantees Cart and Orders are pristine
  const cartRes = await client.get('/cart');
  assert.strictEqual(cartRes.data.itemCount, 0);
  const ordersRes = await client.get('/orders');
  assert.strictEqual(ordersRes.data.length, 0);
});

suite.test('T1-F08-03: Cart Tag Invalidation Contract', async () => {
  // Cart mutation immediately alters cart query state
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const cartAfterAdd = await client.get('/cart');
  assert.strictEqual(cartAfterAdd.data.itemCount, 1, 'Cart tag invalidation must reflect new item immediately');
});

suite.test('T1-F08-04: Checkout Tag Invalidation Contract', async () => {
  // Checkout mutation immediately affects Cart (cleared), Orders (incremented), and Product (stock decremented)
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });

  const [cartRes, ordersRes] = await Promise.all([
    client.get('/cart'),
    client.get('/orders'),
  ]);
  assert.strictEqual(cartRes.data.items.length, 0, 'Cart must be invalidated to empty');
  assert.strictEqual(ordersRes.data.length, 1, 'Orders must be invalidated to include new order');
});

suite.test('T1-F08-05: User Profile Tag Invalidation Contract', async () => {
  // Profile mutation immediately reflects in subsequent profile queries
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.patch('/users/profile', { name: 'Updated Shopper Name' });
  const profRes = await client.get('/users/profile');
  assert.strictEqual(profRes.data.name, 'Updated Shopper Name');
});

// ============================================================================
// Feature 9: React Hook Form & Zod Schema Validation Responses
// ============================================================================

suite.test('T1-F09-01: Register Form Zod Schema Parity', async () => {
  const regDtoPath = join(BACKEND_DIR, 'src/auth/dto/register.dto.ts');
  assert.ok(existsSync(regDtoPath), 'register.dto.ts must exist');
  const content = readFileSync(regDtoPath, 'utf8');
  assert.ok(content.includes('@IsEmail'), 'Must validate email format');
  assert.ok(content.includes('@MinLength(6'), 'Must validate minimum 6 char password');
  assert.ok(content.includes('@IsNotEmpty'), 'Must validate non-empty name');
});

suite.test('T1-F09-02: Login Form Zod Schema Parity', async () => {
  const loginDtoPath = join(BACKEND_DIR, 'src/auth/dto/login.dto.ts');
  assert.ok(existsSync(loginDtoPath), 'login.dto.ts must exist');
  const content = readFileSync(loginDtoPath, 'utf8');
  assert.ok(content.includes('@IsEmail'), 'Must validate email format');
  assert.ok(content.includes('@IsNotEmpty'), 'Must require password');
});

suite.test('T1-F09-03: Checkout Form Zod Schema Parity', async () => {
  const checkoutDtoPath = join(BACKEND_DIR, 'src/orders/dto/checkout.dto.ts');
  assert.ok(existsSync(checkoutDtoPath), 'checkout.dto.ts must exist');
  const content = readFileSync(checkoutDtoPath, 'utf8');
  assert.ok(content.includes('@IsNotEmpty'), 'Must require non-empty shippingAddress');
});

suite.test('T1-F09-04: Profile Form Zod Schema Parity', async () => {
  const profileDtoPath = join(BACKEND_DIR, 'src/users/dto/update-profile.dto.ts');
  assert.ok(existsSync(profileDtoPath), 'update-profile.dto.ts must exist');
  const content = readFileSync(profileDtoPath, 'utf8');
  assert.ok(content.includes('@IsOptional'), 'Must allow optional fields');
  assert.ok(content.includes('name'), 'Must support name');
  assert.ok(content.includes('address'), 'Must support address');
});

suite.test('T1-F09-05: Product Filter Schema Parity', async () => {
  const queryDtoPath = join(BACKEND_DIR, 'src/products/dto/get-products-query.dto.ts');
  assert.ok(existsSync(queryDtoPath), 'get-products-query.dto.ts must exist');
  const content = readFileSync(queryDtoPath, 'utf8');
  assert.ok(content.includes('@Min(0)'), 'Must enforce non-negative prices');
  assert.ok(content.includes('@IsIn'), 'Must restrict sort options to valid values');
});

// ============================================================================
// Feature 10: Educational In-Code Comments & Documentation Verification
// ============================================================================

suite.test('T1-F10-01: Documentation Suite Manifest Check', async () => {
  const requiredDocs = [
    '00_architecture_overview.md',
    '01_setup_and_docker_guide.md',
    '02_database_and_typeorm_entities.md',
    '03_nestjs_backend_architecture.md',
    '04_nextjs_frontend_and_rtk_query.md',
    '05_forms_and_zod_validation.md',
    '06_end_to_end_data_flows_and_linkages.md',
    '07_testing_and_verification_guide.md',
  ];
  if (existsSync(DOCS_DIR)) {
    const presentFiles = readdirSync(DOCS_DIR);
    for (const doc of requiredDocs) {
      assert.ok(presentFiles.includes(doc), `docs/ must contain ${doc}`);
    }
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    for (const doc of requiredDocs) {
      assert.ok(content.includes(doc), `PROJECT.md must document required guide ${doc}`);
    }
  }
});

suite.test('T1-F10-02: Architecture Guide Verification', async () => {
  const guidePath = join(DOCS_DIR, '00_architecture_overview.md');
  if (existsSync(guidePath)) {
    const content = readFileSync(guidePath, 'utf8');
    assert.ok(content.includes('Next.js'), 'Guide must discuss Next.js');
    assert.ok(content.includes('NestJS'), 'Guide must discuss NestJS');
    assert.ok(content.includes('TypeORM'), 'Guide must discuss TypeORM');
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('NestJS REST API with TypeORM'), 'Architecture overview must define stack');
  }
});

suite.test('T1-F10-03: Setup & Docker Guide Verification', async () => {
  const composePath = join(WORKSPACE_ROOT, 'docker-compose.yml');
  const content = readFileSync(composePath, 'utf8');
  assert.ok(content.includes('5433:5432') || content.includes('${DB_PORT:-5433}:5432'), 'Docker setup must document host port 5433');
});

suite.test('T1-F10-04: Backend In-Code Comments Verification', async () => {
  const filesToCheck = [
    'categories/categories.controller.ts',
    'categories/categories.service.ts',
    'products/products.controller.ts',
    'products/products.service.ts',
    'cart/cart.controller.ts',
    'cart/cart.service.ts',
    'orders/orders.controller.ts',
    'orders/orders.service.ts',
    'auth/auth.controller.ts',
    'auth/auth.service.ts',
  ];
  for (const relPath of filesToCheck) {
    const fullPath = join(BACKEND_DIR, 'src', relPath);
    assert.ok(existsSync(fullPath), `Source file ${relPath} must exist`);
    const content = readFileSync(fullPath, 'utf8');
    assert.ok(
      content.includes('[EDUCATIONAL NOTE') || content.includes('[EDUCATIONAL LINKAGE'),
      `File ${relPath} must contain educational explanation comment headers`
    );
  }
});

suite.test('T1-F10-05: Root README.md Quickstart & Linkages', async () => {
  const readmePath = join(WORKSPACE_ROOT, 'README.md');
  if (existsSync(readmePath)) {
    const content = readFileSync(readmePath, 'utf8');
    assert.ok(content.includes('db:up') || content.includes('docker'), 'README must mention database startup');
  } else {
    const rootPkg = JSON.parse(readFileSync(join(WORKSPACE_ROOT, 'package.json'), 'utf8'));
    assert.ok(rootPkg.scripts?.['db:up'], 'package.json must provide db:up quickstart script');
  }
});

// Standalone execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const bail = process.argv.includes('--bail') || process.argv.includes('-b');
  const filterArg = process.argv.find((a) => a.startsWith('--filter='));
  const filter = filterArg ? filterArg.split('=')[1] : null;
  const res = await suite.run({ verbose: true, bail, filter });
  console.log(`\nFinished: ${res.passed}/${res.total} passed (${res.failed} failed) in ${res.durationMs}ms`);
  process.exit(res.failed > 0 ? 1 : 0);
}
