import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';
import { createCustomerSession, customerSessionCookie, hashCustomerPassword, normalizeContact } from '@/lib/customer-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const contact = typeof body.contact === 'string' ? body.contact : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length < 2) {
      return Response.json({ error: 'Please enter your full name' }, { status: 400 });
    }
    const normalized = normalizeContact(contact);
    if (!normalized) {
      return Response.json({ error: 'Enter a valid email address or phone number (e.g. +250 7XX XXX XXX)' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const where = normalized.kind === 'email' ? { email: normalized.value } : { phone: normalized.value };
    const existing = await db.customer.findFirst({ where, select: { id: true } });
    if (existing) {
      return Response.json({ error: 'An account with this email or phone already exists. Try signing in instead.' }, { status: 409 });
    }

    const customer = await db.customer.create({
      data: {
        name,
        email: normalized.kind === 'email' ? normalized.value : null,
        phone: normalized.kind === 'phone' ? normalized.value : null,
        passwordHash: hashCustomerPassword(password),
      },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
    });

    const response = Response.json({ ok: true, customer }, { status: 201 });
    response.headers.append('Set-Cookie', customerSessionCookie(createCustomerSession(customer.id)));
    return response;
  } catch (error) {
    return apiErrorResponse('customer-register', error);
  }
}
