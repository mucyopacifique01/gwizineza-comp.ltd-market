import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Product prices are intentionally left at 0 until the real selling prices are set in Admin.
const products = [
  { sku: 'DOV-001', name: 'Dove Go Fresh Beauty Bar', slug: 'dove-go-fresh-beauty-bar', priceRwf: 0, stock: 50, category: 'Personal Care', imageUrl: '/products/dove-soap.jpg' },
  { sku: 'RIC-001', name: 'Rice 10kg', slug: 'rice-10kg', priceRwf: 0, stock: 30, category: 'Groceries', imageUrl: '/products/rice-10kg.jpg' },
  { sku: 'RIC-002', name: 'Rice Bag', slug: 'rice-bag', priceRwf: 0, stock: 30, category: 'Groceries', imageUrl: '/products/rice-bag.jpg' },
  { sku: 'SUG-001', name: 'Sugar Cane', slug: 'sugar-cane', priceRwf: 0, stock: 40, category: 'Groceries', imageUrl: '/products/sugar.jpg' },
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
