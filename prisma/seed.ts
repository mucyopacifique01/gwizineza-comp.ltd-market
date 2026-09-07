import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const products = [
  { sku: 'ESS-001', name: 'Everyday Essentials', slug: 'everyday-essentials', priceRwf: 12500, stock: 50, category: 'Featured' },
  { sku: 'HOM-001', name: 'Home & Kitchen', slug: 'home-kitchen', priceRwf: 18000, stock: 30, category: 'Popular' },
  { sku: 'CAR-001', name: 'Personal Care', slug: 'personal-care', priceRwf: 9500, stock: 40, category: 'New' },
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
      update: { name: item.name, slug: item.slug, priceRwf: item.priceRwf, stock: item.stock, categoryId: category.id, isActive: true },
      create: { sku: item.sku, name: item.name, slug: item.slug, priceRwf: item.priceRwf, stock: item.stock, categoryId: category.id, isActive: true },
    });
  }
}

main().finally(() => db.$disconnect());
