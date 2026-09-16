import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
    return Response.json({ categories });
  } catch (error) {
    return apiErrorResponse('categories', error);
  }
}
