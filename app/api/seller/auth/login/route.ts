import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';
import { createSellerSession, sellerCookieName, verifySellerPassword } from '@/lib/seller-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const seller = await db.seller.findFirst({ where: { loginUsername: username } });
    if (!seller || !seller.passwordHash || !verifySellerPassword(password, seller.passwordHash)) {
      return Response.json({ error: 'Invalid seller login credentials' }, { status: 401 });
    }

    if (seller.status !== 'APPROVED') {
      return Response.json({ error: seller.status === 'PENDING' ? 'Your seller account is waiting for owner approval' : 'Your seller account is suspended' }, { status: 403 });
    }

    const response = Response.json({
      ok: true,
      seller: { id: seller.id, businessName: seller.businessName, ownerName: seller.ownerName },
    });
    response.headers.append('Set-Cookie', `${sellerCookieName}=${createSellerSession(seller.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
    return response;
  } catch (error) {
    return apiErrorResponse('seller-login', error);
  }
}
