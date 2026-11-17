# 07. Testing & Verification Guide

This document covers the comprehensive testing strategy implemented across the project: isolated unit testing with Jest, controller integration testing with Supertest, frontend build verification, and the standalone 4-tier opaque-box End-to-End (E2E) verification harness.

---

## 1. Multi-Layer Testing Architecture Philosophy

A production-grade web application requires testing at multiple levels of abstraction. Relying solely on unit tests misses wiring and integration bugs, while relying solely on end-to-end tests makes debugging slow and brittle.

This project implements a multi-layer testing pyramid:

```
                  ┌───────────────────────────────┐
                  │          Tier 4 E2E           │  5 Multi-Step Real-World Scenarios
                  │    Real-World User Journeys   │
                  ├───────────────────────────────┤
                  │          Tier 3 E2E           │  10 Cross-Feature Interaction Tests
                  │    Cross-Feature Linkages     │
                  ├───────────────────────────────┤
                  │          Tier 2 E2E           │  50 Boundary & Negative Tests
                  │    Boundary & Corner Cases    │
                  ├───────────────────────────────┤
                  │          Tier 1 E2E           │  50 Isolated Happy-Path Tests
                  │    Feature Smoke Coverage     │
                  ├───────────────────────────────┤
                  │     Controller Integration    │  NestJS TestingModule + Supertest
                  │         HTTP Pipeline         │  (backend/test/app.e2e-spec.ts)
                  ├───────────────────────────────┤
                  │       Service Unit Tests      │  Jest Unit Tests with Mock Repos
                  │         Business Logic        │  (backend/src/**/*.spec.ts)
                  └───────────────────────────────┘
```

### Layer Comparison:

| Layer | Runner / Tool | Target | Focus | Execution Speed |
|---|---|---|---|---|
| **Unit Tests** | Jest (`npm run backend:test`) | `backend/src/**/*.spec.ts` | Isolated business logic, edge conditions, mocked DB calls | Very fast (< 5s) |
| **Controller Integration** | Supertest (`npm --prefix backend run test:e2e`) | `backend/test/app.e2e-spec.ts` | Routing, NestJS `ValidationPipe`, guards, HTTP status codes | Fast (< 10s) |
| **Frontend Verification** | Next CLI (`npm run frontend:build`) | `frontend/src/` | TypeScript strict mode, Zod schemas, RTK Query hooks | Moderate (~20s) |
| **E2E Harness** | Native Node ESM (`npm run test:e2e`) | `tests/e2e/run-all.mjs` | Black-box HTTP API against live NestJS & PostgreSQL (115 tests) | Complete (~15s) |

---

## 2. Standalone 4-Tier E2E Testing Harness

Located in `tests/e2e/`, the end-to-end testing suite is built as a zero-dependency, native Node.js ESM test harness. It requires no heavy browser dependencies (such as Cypress or Playwright) to verify backend API semantics, database integrity, and full-stack contracts.

### Summary of Tiers:

```
┌──────────────────────────────────────────────┬──────────┬──────────┬─────────┬────────────┐
│ Test Suite Tier                              │   Passed │   Failed │   Total │   Duration │
├──────────────────────────────────────────────┼──────────┼──────────┼─────────┼────────────┤
│ Tier 1: Feature Coverage                     │       50 │        0 │      50 │      2.14s │
│ Tier 2: Boundary & Corner Cases              │       50 │        0 │      50 │      1.98s │
│ Tier 3: Cross-Feature Interactions           │       10 │        0 │      10 │      1.45s │
│ Tier 4: Real-World Scenarios                 │        5 │        0 │       5 │      2.32s │
├──────────────────────────────────────────────┼──────────┼──────────┼─────────┼────────────┤
│ TOTAL                                        │      115 │        0 │     115 │      7.89s │
└──────────────────────────────────────────────┴──────────┴──────────┴─────────┴────────────┘
```

---

### Tier 1: Feature Coverage (50 Tests)
Tier 1 contains **5 isolated tests for each of the 10 core features** (50 tests total). Each test verifies that the feature is functioning under normal, happy-path conditions:
- **Feature 1: PostgreSQL Docker Service & DB Connectivity** (T1-F01-01 to 05): Validates `docker-compose.yml` service, live database connection via `/api/categories`, table schema execution, and seeded category presence.
- **Feature 2: User Registration & JWT Authentication** (T1-F02-01 to 05): Validates user registration, login credential validation, JWT token return, `GET /api/auth/me` with Bearer token, and user profile data retrieval.
- **Feature 3: Product Catalog, Search & Filtering** (T1-F03-01 to 05): Validates product listing, category filter, case-insensitive text search, price bounds, and single product detail retrieval.
- **Feature 4: Shopping Cart Operations** (T1-F04-01 to 05): Validates cart provisioning, adding items, quantity updates, single item deletion, and cart clearing.
- **Feature 5: Checkout & Order Creation** (T1-F05-01 to 05): Validates cart checkout, order creation with 'pending' status, inventory stock reduction, order item snapshotting, and cart clearing.
- **Feature 6: User Profile & Order History** (T1-F06-01 to 05): Validates profile viewing, profile editing, order history listing, order detail retrieval, and customer order scoping.
- **Feature 7: Next.js Frontend Compilation & Build Artifacts** (T1-F07-01 to 05): Validates Next.js configuration, page route structure, TypeScript compilation, and Tailwind CSS assets.
- **Feature 8: RTK Query State Management & Cache Tag Invalidation** (T1-F08-01 to 05): Validates tag definition array (`['Product', 'Category', 'Cart', 'Order', 'User', 'Auth']`), query/mutation injection, store configuration, and token injection.
- **Feature 9: React Hook Form & Zod Schema Validation** (T1-F09-01 to 05): Validates login schema, register schema, profile schema, checkout schema, and filter schema.
- **Feature 10: Educational Comments & Documentation Completeness** (T1-F10-01 to 05): Validates presence of `[EDUCATIONAL NOTE]` in backend controllers, services, entities, and frontend components.

---

### Tier 2: Boundary & Corner Cases (50 Tests)
Tier 2 exercises **negative tests, edge conditions, security constraints, and boundary limits** across all 10 features:
- **SQL Injection Immunity**: Injects `' OR '1'='1` and `'; DROP TABLE users; --` into search and category parameters; verifies zero SQL syntax errors and safe handling.
- **Authentication Boundaries**: Duplicate registration (HTTP 409 Conflict), short passwords (< 6 chars), malformed email addresses, forged/expired JWT tokens (HTTP 401 Unauthorized), missing headers.
- **Product Boundaries**: Negative price filters, inverted price ranges (`minPrice > maxPrice`), non-existent UUIDs (HTTP 404), page 0 or negative pagination.
- **Inventory & Cart Boundaries**: Attempting to add 0 or negative quantity, attempting to add more units than available in physical stock, attempting to update non-existent cart item.
- **Checkout Boundaries**: Attempting checkout with an empty cart (HTTP 400 Bad Request), checkout with depleted stock, checkout with whitespace-only delivery address.
- **Security & Authorization**: Attempting to view another user's order receipt (HTTP 403 Forbidden), updating profile without token (HTTP 401), unauthorized role escalation.

---

### Tier 3: Cross-Feature Interactions (10 Tests)
Tier 3 tests **pairwise interactions between feature domains** to ensure state and business logic synchronize correctly:
1. **T3-01: Auth + Cart Isolation (F2 + F4)**: User Alpha and User Beta register. Alpha adds items to cart. Beta's cart remains completely empty and pristine.
2. **T3-02: Cart + Inventory Decrement (F4 + F3 + F5)**: Placing an order for 2 units of a product decrements the catalog product stock by exactly 2 units.
3. **T3-03: Checkout + Cart Clear (F5 + F4)**: Successful checkout completely wipes all items from the customer's cart.
4. **T3-04: Profile Address + Checkout Auto-fill (F6 + F5)**: Address saved in customer profile is automatically used during checkout and saved on the order.
5. **T3-05: Product Catalog Stock Guard + Cart Addition (F3 + F4)**: Adding items exceeding catalog stock is rejected with `Insufficient stock`.
6. **T3-06: Auth Guard: Public Catalog vs Protected Cart (F2 + F3 + F4)**: Catalog is accessible to guests; cart and checkout reject unauthenticated requests with HTTP 401.
7. **T3-07: Category Slug vs UUID Equivalence in Catalog Filter (F3 + F1)**: Filtering by category slug (`electronics`) and category UUID yields the exact same product list.
8. **T3-08: Order Creation + Order History Ordering (F5 + F6)**: Sequential orders are returned in order history sorted by `createdAt DESC` (newest first).
9. **T3-09: Price Filter + Text Search Compound Filter (F3)**: Combining keyword search and `maxPrice` filters items simultaneously on both conditions.
10. **T3-10: Cart Item Quantity Accumulation Guard (F4 + F3)**: Adding items in multiple successive requests prevents accumulated quantity from exceeding stock.

---

### Tier 4: Real-World Scenarios (5 Scenarios)
Tier 4 executes **complete end-to-end customer workflows** consisting of 7 to 10 sequential operations:
1. **T4-01: Full Shopper Journey**: Register -> explore catalog -> filter by category -> view product detail -> add to cart -> adjust quantity to 2 -> checkout -> verify cart is emptied -> verify order appears in history -> retrieve itemized receipt.
2. **T4-02: Inventory Depletion & Boundary Guard**: Product with stock $S$ is completely bought out by User A -> catalog stock drops to 0 -> User B attempts to add product -> rejected with HTTP 400 Insufficient Stock.
3. **T4-03: Concurrent Cart & Session Isolation**: User Alpha and User Beta shop concurrently for different products -> Alpha checks out -> Alpha's cart is cleared -> Beta's cart remains intact -> Beta checks out -> separate order records generated.
4. **T4-04: Profile Modification & Address Persistence**: User registers -> saves shipping address in profile -> shops for product -> checks out -> order receipt preserves profile address.
5. **T4-05: Seed Data Integrity & Product Search Robustness**: Verifies 4 seeded categories, at least 12 seeded products, case-insensitive search (`HEADPHONES` == `headphones` == `Headphones`), compound filtering, and seeded test account login (`user@example.com` / `password123`).

---

## 3. How to Run Tests & Interpret Outputs

### Running All Tests:
```bash
# Run complete 4-tier E2E test suite (115 tests)
npm run test:e2e

# Run with verbose output showing every test case as it executes
npm run test:e2e -- --verbose

# Run with bail mode (stop immediately on first failure)
npm run test:e2e -- --bail
```

### Running Specific Tiers:
```bash
# Run only Tier 1 (Feature Coverage)
npm run test:e2e -- --tier=1

# Run only Tier 2 (Boundary & Corner Cases)
npm run test:e2e -- --tier=2

# Run only Tier 3 (Cross-Feature Interactions)
npm run test:e2e -- --tier=3

# Run only Tier 4 (Real-World Scenarios)
npm run test:e2e -- --tier=4
```

### Filtering Tests:
```bash
# Run only tests matching a keyword (e.g., 'cart', 'auth', 'stock')
npm run test:e2e -- --filter=cart
```

### Running Backend Unit & Integration Tests:
```bash
# Run backend Jest unit tests
npm run backend:test

# Run backend controller integration tests
npm --prefix backend run test:e2e
```

### Interpreting E2E Test Failures:
When a test fails, the runner outputs a structured failure block:
```
================================================================
 FAILURE DETAILS
================================================================

1) [Tier 2: Boundary & Corner Cases] T2-F04-02: Cart Stock Boundary Check
   Error: Expected HTTP 400 Bad Request, got HTTP 201 Created
   at expectStatus (tests/e2e/helpers/api-client.mjs:42:12)
   at tests/e2e/tier2-boundary-corner.test.mjs:154:7

================================================================
❌ FAILED: 1 test(s) failed.
```
- **Tier Name**: Identifies which layer of testing caught the regression.
- **Test ID**: Points directly to the test case in `tests/e2e/`.
- **Error Description**: Explains what was expected vs. what was received.
- **Stack Trace**: Directly cites the file and line number.
