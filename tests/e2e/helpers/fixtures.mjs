// tests/e2e/helpers/fixtures.mjs
import crypto from 'node:crypto';

export function randomHex(bytes = 4) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function randomEmail(prefix = 'shopper') {
  return `${prefix}_${Date.now()}_${randomHex(3)}@example.com`;
}

export function randomPassword(base = 'P@ssw0rd') {
  return `${base}_${randomHex(2)}!`;
}

export function generateUser(overrides = {}) {
  const rand = randomHex(3);
  return {
    email: randomEmail(`user_${rand}`),
    password: randomPassword(),
    name: `Test User ${rand}`,
    ...overrides,
  };
}

export function generateShippingAddress(overrides = {}) {
  const rand = randomHex(2);
  return {
    fullName: `Recipient ${rand}`,
    street: `${Math.floor(Math.random() * 900 + 100)} Market Street`,
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    country: 'USA',
    ...overrides,
  };
}

export function generateShippingAddressString(overrides = {}) {
  const addr = generateShippingAddress(overrides);
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
}

export function generateCategory(overrides = {}) {
  const rand = randomHex(3);
  return {
    name: `Category ${rand}`,
    slug: `cat-${Date.now()}-${randomHex(2)}`,
    description: `Educational test category description ${rand}`,
    ...overrides,
  };
}

export function generateProduct(categoryId, overrides = {}) {
  const rand = randomHex(3);
  return {
    name: `Test Product ${rand}`,
    description: `High quality test product for educational ecommerce demo ${rand}`,
    price: 49.99,
    stock: 25,
    categoryId,
    ...overrides,
  };
}
