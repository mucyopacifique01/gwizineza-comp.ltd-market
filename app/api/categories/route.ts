import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
  return Response.json({ categories });
}
