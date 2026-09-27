import { db } from '@/lib/prisma';
import { requireSeller } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { uploadProductImage } from '@/lib/storage';

export const runtime = 'nodejs';

/** NEW: approved sellers upload images for their own products (same storage as admin). */
export async function POST(request: Request) {
  try {
    const sellerId = requireSeller();
    const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'file is required' }, { status: 400 });
    const result = await uploadProductImage(file);
    if ('error' in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse('seller/image-upload', error);
  }
}
