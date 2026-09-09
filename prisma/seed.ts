import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Prices and stock are intentionally 0 until the real values are set in Admin.
const products = [
  { sku: 'DOV-001', name: 'Dove Go Fresh Beauty Bar', slug: 'dove-go-fresh-beauty-bar', priceRwf: 0, stock: 50, category: 'Personal Care', imageUrl: '/products/dove-soap.jpg' },
  { sku: 'RIC-001', name: 'Rice 10kg', slug: 'rice-10kg', priceRwf: 0, stock: 30, category: 'Groceries', imageUrl: '/products/rice-10kg.jpg' },
  { sku: 'RIC-002', name: 'Rice Bag', slug: 'rice-bag', priceRwf: 0, stock: 30, category: 'Groceries', imageUrl: '/products/rice-bag.jpg' },
  { sku: 'SUG-001', name: 'Sugar Cane', slug: 'sugar-cane', priceRwf: 0, stock: 40, category: 'Groceries', imageUrl: '/products/sugar.jpg' },
  { sku: 'OIL-001', name: 'Oil', slug: 'oil', priceRwf: 0, stock: 0, category: 'Groceries', imageUrl: null },
  { sku: 'STR-001', name: 'Oil Strainer', slug: 'oil-strainer', priceRwf: 0, stock: 0, category: 'Home & Kitchen', imageUrl: null },
  { sku: 'SPK-001', name: 'Spark Plug', slug: 'spark-plug', priceRwf: 0, stock: 0, category: 'Automotive', imageUrl: null },
  { sku: 'UMB-001', name: 'Umbrella', slug: 'umbrella', priceRwf: 0, stock: 0, category: 'Accessories', imageUrl: null },
  { sku: 'FLA-001', name: 'Flashlight', slug: 'flashlight', priceRwf: 0, stock: 0, category: 'Home & Kitchen', imageUrl: null },
  { sku: 'UND-001', name: 'Underwear', slug: 'underwear', priceRwf: 0, stock: 0, category: 'Clothing', imageUrl: null },
  { sku: 'SOC-001', name: 'Socks', slug: 'socks', priceRwf: 0, stock: 0, category: 'Clothing', imageUrl: null },
  { sku: 'BRU-001', name: 'Brush', slug: 'brush', priceRwf: 0, stock: 0, category: 'Personal Care', imageUrl: null },
  { sku: 'NOT-001', name: 'Notebooks', slug: 'notebooks', priceRwf: 0, stock: 0, category: 'Stationery', imageUrl: null },
  { sku: 'REG-001', name: 'Register', slug: 'register', priceRwf: 0, stock: 0, category: 'Stationery', imageUrl: null },
  { sku: 'STR-002', name: 'Straw', slug: 'straw', priceRwf: 0, stock: 0, category: 'Home & Kitchen', imageUrl: null },
];

async function main() {
  for (const item of products) {
    const category = await db.category.upsert({
      where: { slug: item.category.toLowerCase() },
      update: { name: item.category },
      create: { name: item.category, slug: item.category.toLowerCase() },
    });

    await db.product.upsert({
      where: { sku: item.sku },
      update: { name: item.name, slug: item.slug, priceRwf: item.priceRwf, stock: item.stock, imageUrl: item.imageUrl, categoryId: category.id, isActive: true },
      create: { sku: item.sku, name: item.name, slug: item.slug, priceRwf: item.priceRwf, stock: item.stock, imageUrl: item.imageUrl, categoryId: category.id, isActive: true },
    });
  }
}

main().finally(() => db.$disconnect());
