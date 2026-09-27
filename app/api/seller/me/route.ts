import { db } from '@/lib/prisma';
import { requireSeller } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const sellerId = requireSeller();
    const seller = await db.seller.findUnique({
      where: { id: sellerId },
      select: { id: true, businessName: true, ownerName: true, phone: true, email: true, address: true, status: true, _count: { select: { products: true } } },
    });
    if (!seller || seller.status !== 'APPROVED') return Response.json({ error: 'Seller account is not active' }, { status: 403 });
    return Response.json({ seller });
  } catch (error) {
    return apiErrorResponse('seller-me', error);
  }
}
