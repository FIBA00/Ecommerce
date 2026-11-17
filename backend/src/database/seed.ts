/**
 * [EDUCATIONAL NOTE: Database Seeder Script]
 * 
 * 1. Architecture Role:
 *    Populates the PostgreSQL database with initial development and demonstration data.
 *    Creates essential categories, realistic products across categories, and demo user accounts.
 * 
 * 2. Execution:
 *    Can be run via `npm run seed` (or `npm run backend:seed` from project root).
 *    Uses TypeORM DataSource directly to execute outside the full NestJS HTTP server loop.
 * 
 * 3. Seeded Entities:
 *    - 4 Categories: Electronics, Clothing, Books, Home & Kitchen
 *    - 12 Realistic Products with high-res Unsplash photos, descriptions, and stock counts
 *    - 2 Demo Users (user@example.com / password123, admin@example.com / admin123) with hashed passwords
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';

const seedDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce_dev',
  entities: [User, Category, Product, Cart, CartItem, Order, OrderItem],
  synchronize: true,
});

async function runSeed() {
  console.log('🌱 Starting database seed...');
  await seedDataSource.initialize();
  console.log('✅ Connected to PostgreSQL database.');

  const categoryRepo = seedDataSource.getRepository(Category);
  const productRepo = seedDataSource.getRepository(Product);
  const userRepo = seedDataSource.getRepository(User);
  const cartRepo = seedDataSource.getRepository(Cart);

  // 1. Seed Categories
  const categoriesData = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Cutting-edge gadgets, computing gear, and audio accessories.',
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Premium apparel, comfortable everyday wear, and stylish outfits.',
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Bestselling novels, programming guides, and non-fiction literature.',
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Modern cookware, coffee makers, and smart home essentials.',
    },
  ];

  const categoriesMap = new Map<string, Category>();

  for (const catData of categoriesData) {
    let cat = await categoryRepo.findOne({ where: { slug: catData.slug } });
    if (!cat) {
      cat = categoryRepo.create(catData);
      cat = await categoryRepo.save(cat);
      console.log(`  + Created category: ${cat.name}`);
    } else {
      console.log(`  = Category already exists: ${cat.name}`);
    }
    categoriesMap.set(cat.slug, cat);
  }

  // 2. Seed Products
  const productsData = [
    // Electronics
    {
      name: 'Pro Wireless Noise-Canceling Headphones',
      description: 'Studio-grade acoustic precision with adaptive noise cancellation, 30-hour battery life, and ultra-plush memory foam earcups.',
      price: 249.99,
      stock: 35,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'electronics',
    },
    {
      name: 'Ultra-Slim Mechanical Keyboard',
      description: 'Low-profile mechanical switches with per-key RGB backlighting, aircraft-grade aluminum frame, and multi-device Bluetooth switching.',
      price: 129.50,
      stock: 42,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'electronics',
    },
    {
      name: '4K Ultra-Wide Curved Monitor 34"',
      description: 'Immersive 3440x1440 IPS curved display with 144Hz refresh rate, USB-C 90W power delivery, and factory color calibration.',
      price: 599.00,
      stock: 18,
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'electronics',
    },

    // Clothing
    {
      name: 'Organic Cotton Crewneck Sweatshirt',
      description: 'Heavyweight 400 GSM organic French terry cotton with reinforced ribbed collar, dropped shoulders, and durable pre-shrunk finish.',
      price: 68.00,
      stock: 50,
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'clothing',
    },
    {
      name: 'Water-Resistant Commuter Jacket',
      description: 'Breathable 3-layer technical shell with fully taped seams, concealed zippered pockets, and reflective accents for urban transit.',
      price: 145.00,
      stock: 28,
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'clothing',
    },
    {
      name: 'Minimalist Leather Low-Top Sneakers',
      description: 'Full-grain Italian leather sneakers featuring vulcanized rubber cupsole, waxed cotton laces, and cushioned leather insole.',
      price: 110.00,
      stock: 32,
      imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'clothing',
    },

    // Books
    {
      name: 'Designing Data-Intensive Applications',
      description: 'The definitive guide to the architecture, principles, and trade-offs of modern distributed systems, data storage, and processing pipelines.',
      price: 44.95,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'books',
    },
    {
      name: 'Clean Code: Handbook of Agile Software',
      description: 'A handbook of agile software craftsmanship teaching how to write clean, maintainable, and self-documenting code.',
      price: 39.99,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'books',
    },
    {
      name: 'The Pragmatic Programmer: 20th Anniversary',
      description: 'Timeless principles for building resilient software architectures, mastering career skills, and keeping development enjoyable.',
      price: 49.50,
      stock: 25,
      imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'books',
    },

    // Home & Kitchen
    {
      name: 'Precision Gooseneck Electric Kettle',
      description: 'Variable temperature control with 1-degree increments, LCD display, 60-minute heat hold, and balanced ergonomic pour handle.',
      price: 89.99,
      stock: 22,
      imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'home-kitchen',
    },
    {
      name: 'Cast Iron Dutch Oven 5.5 Quart',
      description: 'Enameled cast iron offering superior heat distribution and retention, tight-fitting lid with moisture bumps, oven-safe up to 500°F.',
      price: 98.00,
      stock: 20,
      imageUrl: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'home-kitchen',
    },
    {
      name: 'Aroma Conical Burr Coffee Grinder',
      description: 'Professional 40mm stainless steel conical burrs with 30 micro-grind settings from espresso to cold brew, anti-static technology.',
      price: 139.00,
      stock: 30,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      categorySlug: 'home-kitchen',
    },
  ];

  for (const item of productsData) {
    const category = categoriesMap.get(item.categorySlug);
    if (!category) continue;

    let product = await productRepo.findOne({ where: { name: item.name } });
    if (!product) {
      product = productRepo.create({
        name: item.name,
        description: item.description,
        price: item.price,
        stock: item.stock,
        imageUrl: item.imageUrl,
        categoryId: category.id,
      });
      await productRepo.save(product);
      console.log(`  + Created product: ${product.name} ($${product.price})`);
    } else {
      product.stock = item.stock;
      product.price = item.price;
      await productRepo.save(product);
      console.log(`  = Restored product stock: ${product.name} (${product.stock})`);
    }
  }

  // 3. Seed Demo Users
  const demoUsers = [
    {
      email: 'user@example.com',
      password: 'password123',
      name: 'Standard Shopper',
      role: 'user' as const,
      address: '123 Main St, Springfield, IL 62701',
    },
    {
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Store Administrator',
      role: 'admin' as const,
      address: '456 Tech Ave, Silicon Valley, CA 94016',
    },
  ];

  for (const demo of demoUsers) {
    let user = await userRepo.findOne({ where: { email: demo.email } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(demo.password, 10);
      user = userRepo.create({
        email: demo.email,
        password: hashedPassword,
        name: demo.name,
        role: demo.role,
        address: demo.address,
      });
      user = await userRepo.save(user);

      // Provision user's cart
      const cart = cartRepo.create({ userId: user.id });
      await cartRepo.save(cart);

      console.log(`  + Created demo account: ${user.email} (${user.role})`);
    } else {
      console.log(`  = Demo account already exists: ${user.email}`);
    }
  }

  console.log('🎉 Database seed completed successfully!');
  await seedDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Seeder error:', err);
  process.exit(1);
});
