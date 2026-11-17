// tests/e2e/tier4-real-world-scenarios.test.mjs
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSuite } from './helpers/suite.mjs';
import { api, createApiClient, expectStatus } from './helpers/api-client.mjs';
import {
  generateUser,
  generateShippingAddressString,
} from './helpers/fixtures.mjs';

export const suite = createSuite('Tier 4: Real-World Scenarios');

async function getAvailableProducts(count = 3) {
  const res = await api.get('/products?limit=50');
  expectStatus(res, 200, 'Failed to fetch catalog products for test');
  const available = res.data.items.filter((p) => Number(p.stock) >= 2);
  assert.ok(available.length >= count, `Need at least ${count} products in catalog`);
  return available.slice(0, count);
}

// ============================================================================
// Scenario 1: Full Shopper Journey
// ============================================================================

suite.test('T4-01: Full Shopper Journey', async () => {
  // Step 1: Register unique customer
  const userData = generateUser({ name: 'Journey Shopper' });
  const regRes = await api.post('/auth/register', userData);
  expectStatus(regRes, 201, 'Step 1: Registration failed');
  const token = regRes.data.accessToken;
  const shopper = createApiClient({ token });

  // Step 2: Explore product catalog
  const catalogRes = await shopper.get('/products?page=1&limit=12');
  expectStatus(catalogRes, 200, 'Step 2: Catalog exploration failed');
  assert.ok(catalogRes.data.items.length > 0, 'Catalog should return items');

  // Step 3: Filter catalog by category
  const filterRes = await shopper.get('/products?category=clothing');
  expectStatus(filterRes, 200, 'Step 3: Category filter failed');

  // Step 4: Pick product for detail view
  const targetProduct = (filterRes.data.items.length > 0)
    ? filterRes.data.items[0]
    : catalogRes.data.items[0];

  const detailRes = await shopper.get(`/products/${targetProduct.id}`);
  expectStatus(detailRes, 200, 'Step 4: Product detail fetch failed');
  assert.strictEqual(detailRes.data.id, targetProduct.id);

  // Step 5: Add product to cart
  const addRes = await shopper.post('/cart/items', { productId: targetProduct.id, quantity: 1 });
  expectStatus(addRes, 201, 'Step 5: Cart addition failed');
  assert.strictEqual(addRes.data.itemCount, 1);
  const cartItemId = addRes.data.items[0].id;

  // Step 6: Update quantity in cart to 2
  const updateRes = await shopper.patch(`/cart/items/${cartItemId}`, { quantity: 2 });
  expectStatus(updateRes, 200, 'Step 6: Quantity update failed');
  assert.strictEqual(updateRes.data.itemCount, 2);
  assert.strictEqual(updateRes.data.items[0].quantity, 2);

  // Step 7: Proceed to checkout
  const shippingAddress = generateShippingAddressString();
  const checkoutRes = await shopper.post('/orders/checkout', { shippingAddress });
  expectStatus(checkoutRes, 201, 'Step 7: Checkout failed');
  const orderId = checkoutRes.data.id;
  assert.strictEqual(checkoutRes.data.status, 'pending');
  assert.strictEqual(checkoutRes.data.shippingAddress, shippingAddress);
  assert.strictEqual(checkoutRes.data.items.length, 1);
  assert.strictEqual(checkoutRes.data.items[0].quantity, 2);

  // Step 8: Verify cart is cleared
  const cartRes = await shopper.get('/cart');
  expectStatus(cartRes, 200, 'Step 8: Cart verification failed');
  assert.strictEqual(cartRes.data.items.length, 0);
  assert.strictEqual(cartRes.data.itemCount, 0);
  assert.strictEqual(cartRes.data.cartTotal, 0);

  // Step 9: Verify order appears in history and fetch receipt
  const ordersRes = await shopper.get('/orders');
  expectStatus(ordersRes, 200, 'Step 9: Order history fetch failed');
  assert.ok(ordersRes.data.some((o) => o.id === orderId), 'Order ID must exist in customer history');

  const receiptRes = await shopper.get(`/orders/${orderId}`);
  expectStatus(receiptRes, 200, 'Step 9: Order receipt fetch failed');
  assert.strictEqual(receiptRes.data.id, orderId);
  assert.strictEqual(receiptRes.data.items[0].productTitle, targetProduct.name);
});

// ============================================================================
// Scenario 2: Inventory Depletion & Boundary Guard
// ============================================================================

suite.test('T4-02: Inventory Depletion & Boundary Guard', async () => {
  // Step 1: Retrieve available product with stock S
  const [product] = await getAvailableProducts(1);
  const currentStock = Number(product.stock);
  assert.ok(currentStock >= 1, 'Product must have available stock for depletion test');

  // Step 2: Register User A
  const userA = generateUser({ name: 'Buyer Alpha' });
  const regA = await api.post('/auth/register', userA);
  const clientA = createApiClient({ token: regA.data.accessToken });

  // Step 3: User A adds all S units to cart
  const addRes = await clientA.post('/cart/items', { productId: product.id, quantity: currentStock });
  expectStatus(addRes, 201);
  assert.strictEqual(addRes.data.itemCount, currentStock);

  // Step 4: User A attempts to add 1 more unit (exceeds stock)
  const overAddRes = await clientA.post('/cart/items', { productId: product.id, quantity: 1 });
  expectStatus(overAddRes, 400, 'Should reject addition when stock is exhausted');

  // Step 5: User A completes checkout
  const checkoutRes = await clientA.post('/orders/checkout', {
    shippingAddress: generateShippingAddressString(),
  });
  expectStatus(checkoutRes, 201);

  // Step 6: Verify product stock is now 0
  const prodCheck = await api.get(`/products/${product.id}`);
  expectStatus(prodCheck, 200);
  assert.strictEqual(Number(prodCheck.data.stock), 0, 'Catalog stock should be decremented to 0');

  // Step 7: Register User B and attempt to add depleted product
  const userB = generateUser({ name: 'Buyer Beta' });
  const regB = await api.post('/auth/register', userB);
  const clientB = createApiClient({ token: regB.data.accessToken });

  const depletedAdd = await clientB.post('/cart/items', { productId: product.id, quantity: 1 });
  expectStatus(depletedAdd, 400, 'Adding out-of-stock product must return HTTP 400 Bad Request');
  assert.ok(
    String(depletedAdd.data?.message).includes('Insufficient stock'),
    'Expected insufficient stock message'
  );

  // Step 8: Restore the depleted product's stock for test suite idempotency
  try {
    const { execSync } = await import('node:child_process');
    execSync(
      `docker exec ecommerce_postgres psql -U postgres -d ecommerce_dev -c "UPDATE products SET stock = ${currentStock} WHERE id = '${product.id}';"`,
      { stdio: 'pipe' },
    );
  } catch {
    try {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      const { Client } = require(join(BACKEND_DIR, 'node_modules/pg'));
      const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5433),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'ecommerce_dev',
      });
      await client.connect();
      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [currentStock, product.id]);
      await client.end();
    } catch {
      // ignore
    }
  }
});

// ============================================================================
// Scenario 3: Concurrent Cart & Session Isolation
// ============================================================================

suite.test('T4-03: Concurrent Cart & Session Isolation', async () => {
  const [prod1, prod2, prod3] = await getAvailableProducts(3);

  // Step 1: Register User Alpha and User Beta concurrently
  const [regAlpha, regBeta] = await Promise.all([
    api.post('/auth/register', generateUser({ name: 'Concurrent Alpha' })),
    api.post('/auth/register', generateUser({ name: 'Concurrent Beta' })),
  ]);
  expectStatus(regAlpha, 201);
  expectStatus(regBeta, 201);

  const clientAlpha = createApiClient({ token: regAlpha.data.accessToken });
  const clientBeta = createApiClient({ token: regBeta.data.accessToken });

  // Step 2: User Alpha adds prod1 (qty 2) and prod2 (qty 1)
  await clientAlpha.post('/cart/items', { productId: prod1.id, quantity: 2 });
  await clientAlpha.post('/cart/items', { productId: prod2.id, quantity: 1 });

  // Step 3: User Beta adds prod3 (qty 3)
  await clientBeta.post('/cart/items', { productId: prod3.id, quantity: 3 });

  // Step 4 & 5: Check cart contents
  const [alphaCart, betaCart] = await Promise.all([
    clientAlpha.get('/cart'),
    clientBeta.get('/cart'),
  ]);
  assert.strictEqual(alphaCart.data.items.length, 2);
  assert.strictEqual(alphaCart.data.itemCount, 3);

  assert.strictEqual(betaCart.data.items.length, 1);
  assert.strictEqual(betaCart.data.itemCount, 3);
  assert.strictEqual(betaCart.data.items[0].productId, prod3.id);

  // Step 6: User Alpha checks out
  const alphaCheckout = await clientAlpha.post('/orders/checkout', {
    shippingAddress: generateShippingAddressString(),
  });
  expectStatus(alphaCheckout, 201);

  // Step 7: Alpha's cart is cleared
  const alphaCartAfter = await clientAlpha.get('/cart');
  assert.strictEqual(alphaCartAfter.data.items.length, 0);

  // Step 8: Beta's cart remains completely intact
  const betaCartAfter = await clientBeta.get('/cart');
  assert.strictEqual(betaCartAfter.data.items.length, 1);
  assert.strictEqual(betaCartAfter.data.itemCount, 3);

  // Step 9: User Beta checks out successfully
  const betaCheckout = await clientBeta.post('/orders/checkout', {
    shippingAddress: generateShippingAddressString(),
  });
  expectStatus(betaCheckout, 201);

  // Verify separate order histories
  const [alphaOrders, betaOrders] = await Promise.all([
    clientAlpha.get('/orders'),
    clientBeta.get('/orders'),
  ]);
  assert.strictEqual(alphaOrders.data.length, 1);
  assert.strictEqual(alphaOrders.data[0].id, alphaCheckout.data.id);
  assert.strictEqual(betaOrders.data.length, 1);
  assert.strictEqual(betaOrders.data[0].id, betaCheckout.data.id);
});

// ============================================================================
// Scenario 4: Profile Modification & Address Persistence
// ============================================================================

suite.test('T4-04: Profile Modification & Address Persistence', async () => {
  const [product] = await getAvailableProducts(1);

  // Step 1: Register new user
  const user = generateUser({ name: 'Address Tester' });
  const regRes = await api.post('/auth/register', user);
  expectStatus(regRes, 201);
  const client = createApiClient({ token: regRes.data.accessToken });

  // Step 2: Retrieve initial profile (address should be null or empty)
  const initialProfile = await client.get('/users/profile');
  expectStatus(initialProfile, 200);
  assert.ok(!initialProfile.data.address, 'Initial address should be null or empty');

  // Step 3: Update profile with default shipping address
  const homeAddress = '742 Evergreen Terrace, Springfield, OR 97477';
  const updateRes = await client.patch('/users/profile', { address: homeAddress });
  expectStatus(updateRes, 200);
  assert.strictEqual(updateRes.data.address, homeAddress);

  // Step 4: Add product to cart
  await client.post('/cart/items', { productId: product.id, quantity: 1 });

  // Step 5: Checkout passing saved address
  const profile = await client.get('/users/profile');
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: profile.data.address });
  expectStatus(checkoutRes, 201);

  // Step 6: Verify order records saved address
  assert.strictEqual(checkoutRes.data.shippingAddress, homeAddress);

  // Step 7: Verify profile orders relation includes new order
  const updatedProfile = await client.get('/users/profile');
  assert.ok(
    updatedProfile.data.orders.some((o) => o.id === checkoutRes.data.id),
    'Order must appear in profile orders relation'
  );
});

// ============================================================================
// Scenario 5: Seed Data Integrity & Product Search Robustness
// ============================================================================

suite.test('T4-05: Seed Data Integrity & Product Search Robustness', async () => {
  // Step 1: Query categories
  const categoriesRes = await api.get('/categories');
  expectStatus(categoriesRes, 200);
  const slugs = categoriesRes.data.map((c) => c.slug);
  const requiredCategories = ['electronics', 'clothing', 'books', 'home-kitchen'];
  for (const slug of requiredCategories) {
    assert.ok(slugs.includes(slug), `Seeded category "${slug}" must exist in database`);
  }

  // Step 2: Query products total
  const productsRes = await api.get('/products?limit=50');
  expectStatus(productsRes, 200);
  assert.ok(productsRes.data.total >= 12, 'Catalog must contain at least 12 seeded products');

  // Step 3: Case-insensitive search verification
  const [resUpper, resLower, resMixed] = await Promise.all([
    api.get('/products?search=HEADPHONES'),
    api.get('/products?search=headphones'),
    api.get('/products?search=Headphones'),
  ]);
  expectStatus(resUpper, 200);
  expectStatus(resLower, 200);
  expectStatus(resMixed, 200);

  const idsUpper = resUpper.data.items.map((i) => i.id).sort();
  const idsLower = resLower.data.items.map((i) => i.id).sort();
  const idsMixed = resMixed.data.items.map((i) => i.id).sort();

  assert.deepStrictEqual(idsUpper, idsLower, 'Search must be case-insensitive (UPPER vs lower)');
  assert.deepStrictEqual(idsLower, idsMixed, 'Search must be case-insensitive (lower vs Mixed)');

  // Step 4: Multi-filter combination
  const compoundRes = await api.get('/products?category=books&minPrice=10&maxPrice=50&sortBy=price_asc');
  expectStatus(compoundRes, 200);
  if (compoundRes.data.items.length > 1) {
    for (let i = 0; i < compoundRes.data.items.length - 1; i++) {
      const currentPrice = Number(compoundRes.data.items[i].price);
      const nextPrice = Number(compoundRes.data.items[i + 1].price);
      assert.ok(currentPrice <= nextPrice, 'Items must be sorted by price_asc');
    }
  }

  // Step 5: Seed account authentication
  const seedLogin = await api.post('/auth/login', {
    email: 'user@example.com',
    password: 'password123',
  });
  expectStatus(seedLogin, 200, 'Seeded user@example.com login must succeed');
  assert.ok(seedLogin.data.accessToken, 'Seeded login must return accessToken');
  assert.strictEqual(seedLogin.data.user.email, 'user@example.com');
  assert.strictEqual(seedLogin.data.user.name, 'Standard Shopper');
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
