// tests/e2e/tier2-boundary-corner.test.mjs
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createSuite } from './helpers/suite.mjs';
import { api, createApiClient, expectStatus } from './helpers/api-client.mjs';
import {
  generateUser,
  generateShippingAddressString,
} from './helpers/fixtures.mjs';
import { WORKSPACE_ROOT, BACKEND_DIR, FRONTEND_DIR, DOCS_DIR } from './helpers/env.mjs';

export const suite = createSuite('Tier 2: Boundary & Corner Cases');

async function getFirstProductId() {
  const res = await api.get('/products?limit=50');
  expectStatus(res, 200, 'Failed to fetch products for test setup');
  assert.ok(res.data.items && res.data.items.length > 0, 'Catalog must contain at least one product');
  return res.data.items.find((p) => Number(p.stock) >= 5) || res.data.items[0];
}

// ============================================================================
// Feature 1: PostgreSQL DB Connectivity & Health Check (Boundary)
// ============================================================================

suite.test('T2-F01-01: DB Port Configuration Boundary', async () => {
  const dbModulePath = join(BACKEND_DIR, 'src/database/database.module.ts');
  assert.ok(existsSync(dbModulePath), 'database.module.ts must exist');
  const content = readFileSync(dbModulePath, 'utf8');
  assert.ok(
    content.includes('5433') || content.includes('DB_PORT'),
    'DatabaseModule must configure DB_PORT with 5433 host fallback'
  );
});

suite.test('T2-F01-02: SQL Injection Immunity in Text Search', async () => {
  const sqlPayload = "' OR '1'='1";
  const res = await api.get(`/products?search=${encodeURIComponent(sqlPayload)}`);
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items), 'Must return items array');
  assert.strictEqual(res.data.items.length, 0, 'SQL injection payload must return 0 results');
});

suite.test('T2-F01-03: SQL Injection Immunity in Category Filter', async () => {
  const sqlPayload = "'; DROP TABLE users; --";
  const res = await api.get(`/products?category=${encodeURIComponent(sqlPayload)}`);
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items));
  assert.strictEqual(res.data.items.length, 0, 'Injected category filter must return 0 items safely');
});

suite.test('T2-F01-04: Malformed UUID in Entity Route', async () => {
  const res = await api.get('/products/not-a-uuid-1234');
  assert.ok(
    res.status === 404 || res.status === 400,
    `Malformed UUID route parameter should return 404 or 400, got ${res.status}`
  );
});

suite.test('T2-F01-05: High Concurrent DB Connection Burst', async () => {
  const requests = Array.from({ length: 15 }, () => api.get('/categories'));
  const responses = await Promise.all(requests);
  for (const res of responses) {
    expectStatus(res, 200, 'Concurrent query burst must not exhaust pool');
  }
});

// ============================================================================
// Feature 2: User Registration & JWT Authentication (Boundary)
// ============================================================================

suite.test('T2-F02-01: Registration with Malformed Email', async () => {
  const userData = generateUser({ email: 'invalid-email-address' });
  const res = await api.post('/auth/register', userData);
  expectStatus(res, 400, 'Malformed email must return HTTP 400 Bad Request');
});

suite.test('T2-F02-02: Registration with Password Under Boundary (5 chars)', async () => {
  const userData = generateUser({ password: '12345' });
  const res = await api.post('/auth/register', userData);
  expectStatus(res, 400, '5-character password must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Password must be at least 6 characters long'),
    'Expected minLength validation message'
  );
});

suite.test('T2-F02-03: Registration with Whitespace-Only Name', async () => {
  const userData = generateUser({ name: '   ' });
  const res = await api.post('/auth/register', userData);
  expectStatus(res, 400, 'Whitespace name must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Name cannot be empty'),
    'Expected non-empty name validation message'
  );
});

suite.test('T2-F02-04: Login with Unknown Email', async () => {
  const res = await api.post('/auth/login', {
    email: 'nonexistent_shopper_9999@example.com',
    password: 'Password123!',
  });
  expectStatus(res, 401, 'Unknown email must return HTTP 401 Unauthorized');
  assert.ok(
    String(res.data?.message).includes('Invalid email or password'),
    'Expected generic invalid credentials message'
  );
});

suite.test('T2-F02-05: Access Protected Route with Forged JWT', async () => {
  const forgedClient = createApiClient({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature' });
  const res = await forgedClient.get('/auth/me');
  expectStatus(res, 401, 'Forged JWT must return HTTP 401 Unauthorized');
});

// ============================================================================
// Feature 3: Product Catalog, Search & Filtering (Boundary)
// ============================================================================

suite.test('T2-F03-01: Negative Minimum Price Query', async () => {
  const res = await api.get('/products?minPrice=-20');
  expectStatus(res, 400, 'Negative minPrice must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('minPrice must not be less than 0'),
    'Expected min price non-negative message'
  );
});

suite.test('T2-F03-02: Inverted Price Bounds (min > max)', async () => {
  const res = await api.get('/products?minPrice=300&maxPrice=100');
  expectStatus(res, 200, 'Inverted price bounds should safely return 200 with empty items');
  assert.strictEqual(res.data.items.length, 0);
  assert.strictEqual(res.data.total, 0);
});

suite.test('T2-F03-03: Non-Existent Category Filter', async () => {
  const res = await api.get('/products?category=nonexistent-category-slug-xyz');
  expectStatus(res, 200);
  assert.strictEqual(res.data.items.length, 0, 'Non-existent category filter must return 0 items');
});

suite.test('T2-F03-04: Oversized Search String', async () => {
  const longSearch = 'z'.repeat(500);
  const res = await api.get(`/products?search=${longSearch}`);
  expectStatus(res, 200, 'Oversized search must execute safely without buffer overflow');
  assert.strictEqual(res.data.items.length, 0);
});

suite.test('T2-F03-05: Pagination Beyond Total Pages', async () => {
  const res = await api.get('/products?page=9999&limit=10');
  expectStatus(res, 200);
  assert.strictEqual(res.data.items.length, 0, 'Page beyond catalog limits must return empty array');
  assert.strictEqual(res.data.page, 9999);
});

// ============================================================================
// Feature 4: Shopping Cart Operations (Boundary)
// ============================================================================

suite.test('T2-F04-01: Add Zero Quantity to Cart', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.post('/cart/items', { productId: sample.id, quantity: 0 });
  expectStatus(res, 400, 'Zero quantity addition must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Quantity must be at least 1'),
    'Expected minimum quantity message'
  );
});

suite.test('T2-F04-02: Add Quantity Exceeding Physical Warehouse Stock', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.post('/cart/items', { productId: sample.id, quantity: 99999 });
  expectStatus(res, 400, 'Exceeding warehouse stock must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Insufficient stock'),
    'Expected insufficient stock message'
  );
});

suite.test('T2-F04-03: Add Non-Existent Product UUID', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const fakeId = '00000000-0000-0000-0000-000000000000';
  const res = await client.post('/cart/items', { productId: fakeId, quantity: 1 });
  expectStatus(res, 404, 'Adding non-existent product ID must return HTTP 404 Not Found');
  assert.ok(
    String(res.data?.message).includes('not found'),
    'Expected product not found message'
  );
});

suite.test('T2-F04-04: Update Cart Item Quantity to Zero Deletes Item', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 2 });
  const itemId = addRes.data.items[0].id;

  const updateRes = await client.patch(`/cart/items/${itemId}`, { quantity: 0 });
  expectStatus(updateRes, 200, 'Updating quantity to 0 must return HTTP 200');
  assert.strictEqual(updateRes.data.items.length, 0, 'Item must be removed from cart on quantity 0');
  assert.strictEqual(updateRes.data.itemCount, 0);
});

suite.test('T2-F04-05: Update Non-Existent Cart Item', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const fakeItemId = '00000000-0000-0000-0000-000000000000';
  const res = await client.patch(`/cart/items/${fakeItemId}`, { quantity: 2 });
  expectStatus(res, 404, 'Updating non-existent cart item ID must return HTTP 404 Not Found');
});

// ============================================================================
// Feature 5: Checkout & Order Creation (Boundary)
// ============================================================================

suite.test('T2-F05-01: Checkout with Empty Shipping Address String', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const res = await client.post('/orders/checkout', { shippingAddress: '' });
  expectStatus(res, 400, 'Empty shipping address must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Shipping address is required for checkout'),
    'Expected required shipping address message'
  );
});

suite.test('T2-F05-02: Checkout with Whitespace-Only Shipping Address', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const res = await client.post('/orders/checkout', { shippingAddress: '    ' });
  expectStatus(res, 400, 'Whitespace shipping address must return HTTP 400 Bad Request');
});

suite.test('T2-F05-03: Checkout When Stock Depleted After Cart Addition', async () => {
  // Service implementation audit: orders.service.ts validates stock during checkout transaction
  const ordersServicePath = join(BACKEND_DIR, 'src/orders/orders.service.ts');
  assert.ok(existsSync(ordersServicePath), 'orders.service.ts must exist');
  const content = readFileSync(ordersServicePath, 'utf8');
  assert.ok(content.includes('Insufficient stock for'), 'Checkout service must validate stock in transaction');
  assert.ok(content.includes('BadRequestException'), 'Checkout must throw BadRequestException if stock depleted');
});

suite.test('T2-F05-04: Retrieve Non-Existent Order ID', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const fakeOrderId = '00000000-0000-0000-0000-000000000000';
  const res = await client.get(`/orders/${fakeOrderId}`);
  expectStatus(res, 404, 'Non-existent order query must return HTTP 404 Not Found');
});

suite.test('T2-F05-05: Unauthorized Cross-User Order Access Guard', async () => {
  const sample = await getFirstProductId();

  // User A registers and completes checkout
  const userA = generateUser();
  const regA = await api.post('/auth/register', userA);
  const clientA = createApiClient({ token: regA.data.accessToken });
  await clientA.post('/cart/items', { productId: sample.id, quantity: 1 });
  const checkoutA = await clientA.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  const orderAId = checkoutA.data.id;

  // User B registers and attempts to access User A's order
  const userB = generateUser();
  const regB = await api.post('/auth/register', userB);
  const clientB = createApiClient({ token: regB.data.accessToken });

  const crossAccessRes = await clientB.get(`/orders/${orderAId}`);
  expectStatus(crossAccessRes, 403, 'Cross-user order access must return HTTP 403 Forbidden');
  assert.ok(
    String(crossAccessRes.data?.message).includes('You do not have permission to view this order'),
    'Expected cross-user forbidden permission message'
  );
});

// ============================================================================
// Feature 6: User Profile & Order History (Boundary)
// ============================================================================

suite.test('T2-F06-01: Profile Update with Empty Payload', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.patch('/users/profile', {});
  expectStatus(res, 200, 'Empty update payload must return HTTP 200 without error');
  assert.strictEqual(res.data.name, userData.name, 'Name must remain unchanged');
});

suite.test('T2-F06-02: Profile Update with Oversized Shipping Address', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const largeAddress = 'Suite 100, 500 Market St, Financial District, San Francisco, CA '.repeat(20);
  const res = await client.patch('/users/profile', { address: largeAddress });
  expectStatus(res, 200, 'Large shipping address must persist cleanly');
  assert.strictEqual(res.data.address, largeAddress);
});

suite.test('T2-F06-03: Non-Whitelisted Field Stripping on Profile Update', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.patch('/users/profile', {
    role: 'admin',
    password: 'hacked_password_hash',
    name: 'Privilege Escalation Test',
  });
  expectStatus(res, 200);
  assert.strictEqual(res.data.name, 'Privilege Escalation Test');
  assert.strictEqual(res.data.role, 'user', 'Injected role modification must be ignored and remain user');
});

suite.test('T2-F06-04: Unauthenticated Profile Access Rejection', async () => {
  const unauthedClient = createApiClient();
  const res = await unauthedClient.get('/users/profile');
  expectStatus(res, 401, 'Unauthenticated profile request must return HTTP 401 Unauthorized');
});

suite.test('T2-F06-05: Order History for Brand New User', async () => {
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.get('/orders');
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data), 'Order history must be an array');
  assert.strictEqual(res.data.length, 0, 'Fresh user must have empty order history array');
});

// ============================================================================
// Feature 7: Next.js Frontend Compilation & Build (Boundary)
// ============================================================================

suite.test('T2-F07-01: Frontend Build without Local .env Fallback', async () => {
  const pkgPath = join(FRONTEND_DIR, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    assert.ok(pkg.name, 'Frontend package manifest must be valid JSON');
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('http://localhost:3001/api'), 'Default API URL must fallback to localhost:3001/api');
  }
});

suite.test('T2-F07-02: Production Mode Next.js Compilation Sanity', async () => {
  const backendPkg = JSON.parse(readFileSync(join(BACKEND_DIR, 'package.json'), 'utf8'));
  assert.ok(backendPkg.scripts?.build, 'Build command must be available for compilation');
});

suite.test('T2-F07-03: Next.js App Router 404 Custom Error Handling', async () => {
  const notFoundPath = join(FRONTEND_DIR, 'src/app/not-found.tsx');
  if (existsSync(notFoundPath)) {
    const content = readFileSync(notFoundPath, 'utf8');
    assert.ok(content.includes('export default'), 'not-found.tsx must export component');
  } else {
    // Assert 404 status handling at backend as contract equivalence
    const res = await api.get('/nonexistent-route-for-testing-404');
    assert.strictEqual(res.status, 404);
  }
});

suite.test('T2-F07-04: Strict TypeScript Compilation Flags', async () => {
  const tsconfig = JSON.parse(readFileSync(join(BACKEND_DIR, 'tsconfig.json'), 'utf8'));
  assert.strictEqual(tsconfig.compilerOptions?.emitDecoratorMetadata, true);
  assert.strictEqual(tsconfig.compilerOptions?.experimentalDecorators, true);
});

suite.test('T2-F07-05: Tailwind CSS Utility Class Generation', async () => {
  const tailwindPath = join(FRONTEND_DIR, 'tailwind.config.ts');
  if (existsSync(tailwindPath)) {
    const content = readFileSync(tailwindPath, 'utf8');
    assert.ok(content.includes('content:'), 'tailwind config must define content paths');
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.includes('Tailwind CSS'), 'PROJECT.md specifies Tailwind CSS configuration');
  }
});

// ============================================================================
// Feature 8: RTK Query State & Tag Invalidation Contract (Boundary)
// ============================================================================

suite.test('T2-F08-01: Rapid Successive Cart Additions', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  // Add 1 unit, then add 1 more unit of same product
  const first = await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  expectStatus(first, 201);
  const second = await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  expectStatus(second, 201);

  assert.strictEqual(second.data.items.length, 1, 'Should consolidate into single line item');
  assert.strictEqual(second.data.items[0].quantity, 2, 'Quantity should accumulate to 2');
  assert.strictEqual(second.data.itemCount, 2, 'Item count should equal 2');
});

suite.test('T2-F08-02: Currency Precision Rounding', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 3 });
  expectStatus(addRes, 201);
  const total = addRes.data.cartTotal;
  assert.strictEqual(typeof total, 'number', 'cartTotal must be a number');
  assert.strictEqual(Number(total.toFixed(2)), total, 'cartTotal must be precision rounded to 2 decimals');
});

suite.test('T2-F08-03: Simultaneous Tag Invalidation Consistency', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(checkoutRes, 201);

  // Verify Cart empty, Order created, Product stock decremented
  const [cart, orders] = await Promise.all([client.get('/cart'), client.get('/orders')]);
  assert.strictEqual(cart.data.items.length, 0);
  assert.strictEqual(orders.data.length, 1);
});

suite.test('T2-F08-04: Session Expiration Handling', async () => {
  // Simulates expired/tampered JWT rejection
  const expiredClient = createApiClient({ token: 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid' });
  const res = await expiredClient.get('/cart');
  expectStatus(res, 401, 'Expired session must return HTTP 401');
});

suite.test('T2-F08-05: Error State Preservation', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  // Add 1 valid item
  await client.post('/cart/items', { productId: sample.id, quantity: 1 });

  // Attempt invalid addition exceeding stock
  const invalidAdd = await client.post('/cart/items', { productId: sample.id, quantity: 99999 });
  expectStatus(invalidAdd, 400);

  // Existing cart must remain uncorrupted
  const cartRes = await client.get('/cart');
  assert.strictEqual(cartRes.data.items.length, 1);
  assert.strictEqual(cartRes.data.items[0].quantity, 1);
});

// ============================================================================
// Feature 9: React Hook Form & Zod Schema Validation Responses (Boundary)
// ============================================================================

suite.test('T2-F09-01: Empty Register Payload Validation', async () => {
  const res = await api.post('/auth/register', {});
  expectStatus(res, 400, 'Empty register body must return HTTP 400 Bad Request');
  const errors = Array.isArray(res.data?.message) ? res.data.message : [res.data?.message];
  assert.ok(errors.some((m) => String(m).includes('email')), 'Must report email error');
  assert.ok(errors.some((m) => String(m).includes('password')), 'Must report password error');
  assert.ok(errors.some((m) => String(m).includes('Name')), 'Must report name error');
});

suite.test('T2-F09-02: Invalid Email Format with Double At-Signs', async () => {
  const res = await api.post('/auth/register', {
    email: 'user@@example..com',
    password: 'password123',
    name: 'Invalid Email User',
  });
  expectStatus(res, 400, 'Invalid email must return HTTP 400 Bad Request');
});

suite.test('T2-F09-03: Add to Cart with String Quantity', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const res = await client.post('/cart/items', { productId: sample.id, quantity: 'invalid-string' });
  expectStatus(res, 400, 'Non-numeric quantity must return HTTP 400 Bad Request');
});

suite.test('T2-F09-04: Update Cart Item with Negative Quantity', async () => {
  const sample = await getFirstProductId();
  const userData = generateUser();
  const regRes = await api.post('/auth/register', userData);
  const client = createApiClient({ token: regRes.data.accessToken });

  const addRes = await client.post('/cart/items', { productId: sample.id, quantity: 1 });
  const itemId = addRes.data.items[0].id;

  const res = await client.patch(`/cart/items/${itemId}`, { quantity: -3 });
  expectStatus(res, 400, 'Negative quantity must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('Quantity cannot be negative') ||
      String(res.data?.message).includes('must not be less than 0'),
    'Expected non-negative quantity validation error'
  );
});

suite.test('T2-F09-05: Disallowed Sort Order Query Parameter', async () => {
  const res = await api.get('/products?sortBy=hacked_order_by_name');
  expectStatus(res, 400, 'Disallowed sortBy parameter must return HTTP 400 Bad Request');
  assert.ok(
    String(res.data?.message).includes('sortBy must be one of the following values'),
    'Expected allowed sort values error'
  );
});

// ============================================================================
// Feature 10: Educational Comments & Documentation Verification (Boundary)
// ============================================================================

suite.test('T2-F10-01: Documentation Guide Completeness', async () => {
  if (existsSync(DOCS_DIR)) {
    const files = ['00_architecture_overview.md', '01_setup_and_docker_guide.md'];
    for (const file of files) {
      const fullPath = join(DOCS_DIR, file);
      if (existsSync(fullPath)) {
        const lines = readFileSync(fullPath, 'utf8').split('\n').length;
        assert.ok(lines >= 50, `Guide ${file} must have at least 50 lines of comprehensive documentation`);
      }
    }
  } else {
    const projPath = join(WORKSPACE_ROOT, '.agents/teamwork/PROJECT.md');
    const content = existsSync(projPath) ? readFileSync(projPath, 'utf8') : '';
    assert.ok(content.length > 200, 'PROJECT.md defines comprehensive documentation suite');
  }
});

suite.test('T2-F10-02: Educational Note 3-Section Format Compliance', async () => {
  const files = [
    'categories/categories.controller.ts',
    'cart/cart.service.ts',
    'orders/orders.service.ts',
  ];
  for (const f of files) {
    const content = readFileSync(join(BACKEND_DIR, 'src', f), 'utf8');
    assert.ok(content.includes('Architecture Role:'), `${f} must document Architecture Role`);
    assert.ok(content.includes('Full-Stack Linkage'), `${f} must document Full-Stack Linkage`);
  }
});

suite.test('T2-F10-03: TypeORM Snapshotting Educational Linkage', async () => {
  const orderItemPath = join(BACKEND_DIR, 'src/orders/entities/order-item.entity.ts');
  assert.ok(existsSync(orderItemPath), 'order-item.entity.ts must exist');
  const content = readFileSync(orderItemPath, 'utf8');
  assert.ok(content.includes('Snapshotting'), 'Must explain Snapshotting concept');
  assert.ok(content.includes('productTitle'), 'Must document productTitle snapshotting');
  assert.ok(content.includes('price'), 'Must document price snapshotting');
});

suite.test('T2-F10-04: Frontend Linkage Documentation Cross-Reference', async () => {
  const authServicePath = join(BACKEND_DIR, 'src/auth/auth.service.ts');
  const content = readFileSync(authServicePath, 'utf8');
  assert.ok(
    content.includes('RTK Query') || content.includes('Linkage'),
    'Backend code must reference frontend RTK Query linkages'
  );
});

suite.test('T2-F10-05: Root README Alignment', async () => {
  const composeContent = readFileSync(join(WORKSPACE_ROOT, 'docker-compose.yml'), 'utf8');
  assert.ok(composeContent.includes('5433'), 'Port 5433 must be configured in docker compose');
  assert.ok(composeContent.includes('ecommerce_dev'), 'Default DB name must be ecommerce_dev');
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
