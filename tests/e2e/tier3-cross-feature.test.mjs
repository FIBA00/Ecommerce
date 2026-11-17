// tests/e2e/tier3-cross-feature.test.mjs
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSuite } from './helpers/suite.mjs';
import { api, createApiClient, expectStatus } from './helpers/api-client.mjs';
import {
  generateUser,
  generateShippingAddressString,
} from './helpers/fixtures.mjs';

export const suite = createSuite('Tier 3: Cross-Feature Interactions');

async function getAvailableProducts(count = 2) {
  const res = await api.get('/products?limit=50');
  expectStatus(res, 200, 'Failed to fetch catalog products for test');
  const available = res.data.items.filter((p) => Number(p.stock) >= 2);
  assert.ok(available.length >= count, `Need at least ${count} products in catalog`);
  return available.slice(0, count);
}

// ============================================================================
// Tier 3: 10 Cross-Feature Pairwise Interaction Test Cases
// ============================================================================

suite.test('T3-01: Auth + Cart Isolation (F2 + F4)', async () => {
  const [productA] = await getAvailableProducts(1);

  // User Alpha registers and adds product to cart
  const userAlpha = generateUser({ name: 'User Alpha' });
  const regAlpha = await api.post('/auth/register', userAlpha);
  const clientAlpha = createApiClient({ token: regAlpha.data.accessToken });
  await clientAlpha.post('/cart/items', { productId: productA.id, quantity: 2 });

  // User Beta registers
  const userBeta = generateUser({ name: 'User Beta' });
  const regBeta = await api.post('/auth/register', userBeta);
  const clientBeta = createApiClient({ token: regBeta.data.accessToken });

  // Verify Beta's cart is pristine
  const betaCart = await clientBeta.get('/cart');
  assert.strictEqual(betaCart.data.items.length, 0, "Beta's cart must be completely empty");
  assert.strictEqual(betaCart.data.itemCount, 0);

  // Verify Alpha's cart is isolated and retains product
  const alphaCart = await clientAlpha.get('/cart');
  assert.strictEqual(alphaCart.data.items.length, 1);
  assert.strictEqual(alphaCart.data.items[0].productId, productA.id);
  assert.strictEqual(alphaCart.data.items[0].quantity, 2);
});

suite.test('T3-02: Cart + Inventory Decrement (F4 + F3 + F5)', async () => {
  const [product] = await getAvailableProducts(1);
  const initialStock = Number(product.stock);
  assert.ok(initialStock >= 2, 'Product must have at least 2 units in stock');

  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // Add 2 units and checkout
  await client.post('/cart/items', { productId: product.id, quantity: 2 });
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(checkoutRes, 201);

  // Verify product stock in catalog decrements by exactly 2
  const updatedProd = await api.get(`/products/${product.id}`);
  expectStatus(updatedProd, 200);
  assert.strictEqual(Number(updatedProd.data.stock), initialStock - 2, 'Stock must decrement by purchased quantity');
});

suite.test('T3-03: Checkout + Cart Clear (F5 + F4)', async () => {
  const products = await getAvailableProducts(2);
  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // Add multiple distinct products
  await client.post('/cart/items', { productId: products[0].id, quantity: 1 });
  await client.post('/cart/items', { productId: products[1].id, quantity: 1 });

  const cartBefore = await client.get('/cart');
  assert.strictEqual(cartBefore.data.items.length, 2);

  // Checkout
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(checkoutRes, 201);

  // Cart must be emptied
  const cartAfter = await client.get('/cart');
  assert.strictEqual(cartAfter.data.items.length, 0);
  assert.strictEqual(cartAfter.data.itemCount, 0);
  assert.strictEqual(cartAfter.data.cartTotal, 0);
});

suite.test('T3-04: Profile Address + Checkout Auto-fill (F6 + F5)', async () => {
  const [product] = await getAvailableProducts(1);
  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // Update profile default address
  const savedAddress = '742 Evergreen Terrace, Springfield, OR 97477';
  const profileUpdate = await client.patch('/users/profile', { address: savedAddress });
  expectStatus(profileUpdate, 200);

  // Read profile
  const profileRes = await client.get('/users/profile');
  assert.strictEqual(profileRes.data.address, savedAddress);

  // Add to cart and checkout with saved address
  await client.post('/cart/items', { productId: product.id, quantity: 1 });
  const checkoutRes = await client.post('/orders/checkout', { shippingAddress: profileRes.data.address });
  expectStatus(checkoutRes, 201);
  assert.strictEqual(checkoutRes.data.shippingAddress, savedAddress, 'Order receipt must record profile saved address');
});

suite.test('T3-05: Product Catalog Stock Guard + Cart Addition (F3 + F4)', async () => {
  const [product] = await getAvailableProducts(1);
  const stock = Number(product.stock);

  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // Attempt to add stock + 1
  const res = await client.post('/cart/items', { productId: product.id, quantity: stock + 1 });
  expectStatus(res, 400, 'Exceeding catalog stock must be rejected');
  assert.ok(
    String(res.data?.message).includes('Insufficient stock'),
    'Expected insufficient stock message'
  );
});

suite.test('T3-06: Auth Guard: Public Catalog vs Protected Cart (F2 + F3 + F4)', async () => {
  const unauthenticatedClient = createApiClient();

  // Public catalog access succeeds without credentials
  const catalogRes = await unauthenticatedClient.get('/products');
  expectStatus(catalogRes, 200, 'Public catalog must allow guest access');

  // Protected cart access rejected without token
  const cartRes = await unauthenticatedClient.get('/cart');
  expectStatus(cartRes, 401, 'Guest cart query must be rejected with HTTP 401');

  // Protected checkout rejected without token
  const checkoutRes = await unauthenticatedClient.post('/orders/checkout', { shippingAddress: 'Guest St' });
  expectStatus(checkoutRes, 401, 'Guest checkout must be rejected with HTTP 401');
});

suite.test('T3-07: Category Slug vs UUID Equivalence in Catalog Filter (F3 + F1)', async () => {
  const categoriesRes = await api.get('/categories');
  expectStatus(categoriesRes, 200);
  const cat = categoriesRes.data.find((c) => c.slug === 'electronics') || categoriesRes.data[0];
  assert.ok(cat, 'Target category must exist');

  // Query by slug
  const resBySlug = await api.get(`/products?category=${cat.slug}`);
  expectStatus(resBySlug, 200);

  // Query by UUID
  const resByUuid = await api.get(`/products?category=${cat.id}`);
  expectStatus(resByUuid, 200);

  // Assert both queries return identical product sets
  const idsFromSlug = resBySlug.data.items.map((i) => i.id).sort();
  const idsFromUuid = resByUuid.data.items.map((i) => i.id).sort();
  assert.deepStrictEqual(idsFromSlug, idsFromUuid, 'Slug filter and UUID filter must yield identical items');
});

suite.test('T3-08: Order Creation + Order History Ordering (F5 + F6)', async () => {
  const [product] = await getAvailableProducts(1);
  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // First order
  await client.post('/cart/items', { productId: product.id, quantity: 1 });
  const order1 = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(order1, 201);

  // Wait brief interval to guarantee distinct timestamp
  await new Promise((r) => setTimeout(r, 100));

  // Second order
  await client.post('/cart/items', { productId: product.id, quantity: 1 });
  const order2 = await client.post('/orders/checkout', { shippingAddress: generateShippingAddressString() });
  expectStatus(order2, 201);

  // Fetch order history
  const historyRes = await client.get('/orders');
  expectStatus(historyRes, 200);
  assert.strictEqual(historyRes.data.length, 2, 'History must contain 2 orders');
  assert.strictEqual(historyRes.data[0].id, order2.data.id, 'Newest order must appear first (createdAt DESC)');
  assert.strictEqual(historyRes.data[1].id, order1.data.id, 'Older order must appear second');
});

suite.test('T3-09: Price Filter + Text Search Compound Filter (F3)', async () => {
  const [sample] = await getAvailableProducts(1);
  const keyword = sample.name.split(' ')[0];
  const maxPrice = Math.ceil(Number(sample.price)) + 10;

  const res = await api.get(`/products?search=${encodeURIComponent(keyword)}&maxPrice=${maxPrice}`);
  expectStatus(res, 200);
  assert.ok(Array.isArray(res.data.items));
  assert.ok(res.data.items.length > 0, 'Compound filter should return matching items');

  for (const item of res.data.items) {
    const text = (item.name + ' ' + item.description).toLowerCase();
    assert.ok(text.includes(keyword.toLowerCase()), `Item must match search keyword "${keyword}"`);
    assert.ok(Number(item.price) <= maxPrice, `Item price must be <= maxPrice ${maxPrice}`);
  }
});

suite.test('T3-10: Cart Item Quantity Accumulation Guard (F4 + F3)', async () => {
  const [product] = await getAvailableProducts(1);
  const currentStock = Number(product.stock);

  const user = generateUser();
  const reg = await api.post('/auth/register', user);
  const client = createApiClient({ token: reg.data.accessToken });

  // Add all available units to cart
  const firstAdd = await client.post('/cart/items', { productId: product.id, quantity: currentStock });
  expectStatus(firstAdd, 201);

  // Attempt to add 1 more unit of same product
  const secondAdd = await client.post('/cart/items', { productId: product.id, quantity: 1 });
  expectStatus(secondAdd, 400, 'Accumulating beyond stock must return HTTP 400 Bad Request');
  assert.ok(
    String(secondAdd.data?.message).includes('Cannot add') ||
      String(secondAdd.data?.message).includes('Maximum available stock') ||
      String(secondAdd.data?.message).includes('Insufficient stock'),
    'Expected accumulated stock boundary error message'
  );
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
