import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';
import { createCustomerSession, customerSessionCookie, normalizeContact, verifyCustomerPassword } from '@/lib/customer-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const contact = typeof body.contact === 'string' ? body.contact : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const normalized = normalizeContact(contact);
    if (!normalized || !password) {
      return Response.json({ error: 'Enter your email or phone and your password' }, { status: 400 });
    }

    const customer = await db.customer.findFirst({
      where: { OR: [normalized.kind === 'email' ? { email: normalized.value } : { phone: normalized.value }, normalized.kind === 'email' ? { phone: normalized.value } : { email: normalized.value }] },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true, passwordHash: true },
    });

    if (!customer?.passwordHash || !verifyCustomerPassword(password, customer.passwordHash)) {
      return Response.json({ error: 'Incorrect contact or password' }, { status: 401 });
    }

    const response = Response.json({
      ok: true,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, avatarUrl: customer.avatarUrl },
    });
    response.headers.append('Set-Cookie', customerSessionCookie(createCustomerSession(customer.id)));
    return response;
  } catch (error) {
    return apiErrorResponse('customer-login', error);
  }
}
