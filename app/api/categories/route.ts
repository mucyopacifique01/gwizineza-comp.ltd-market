import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export async function GET() {
  try {
    const categories = await db.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } });
    return Response.json({ categories });
  } catch (error) {
    return apiErrorResponse('categories', error);
  }
}

/** NEW (admin): create a category. */
export async function POST(request: Request) {
  try {
    requireAdmin();
    const { name, slug } = await request.json();
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanSlug = slugify(typeof slug === 'string' && slug.trim() ? slug : cleanName);
    if (cleanName.length < 2 || !cleanSlug) return Response.json({ error: 'Category name is required' }, { status: 400 });
    const category = await db.category.create({ data: { name: cleanName, slug: cleanSlug } });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return apiErrorResponse('categories', error);
  }
}

/** NEW (admin): rename a category. */
export async function PATCH(request: Request) {
  try {
    requireAdmin();
    const { id, name, slug } = await request.json();
    if (typeof id !== 'string') return Response.json({ error: 'id is required' }, { status: 400 });
    const data: { name?: string; slug?: string } = {};
    if (typeof name === 'string' && name.trim().length >= 2) data.name = name.trim();
    if (typeof slug === 'string' && slugify(slug)) data.slug = slugify(slug);
    const category = await db.category.update({ where: { id }, data });
    return Response.json({ category });
  } catch (error) {
    return apiErrorResponse('categories', error);
  }
}
