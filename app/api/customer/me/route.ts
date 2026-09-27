import { db } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-errors';
import { customerSessionCookie, createCustomerSession, getCustomerSession, hashCustomerPassword, normalizeContact, requireCustomer, verifyCustomerPassword } from '@/lib/customer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customerId = requireCustomer();
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true, googleId: true, createdAt: true, passwordHash: true },
    });
    if (!customer) return Response.json({ error: 'Account not found' }, { status: 404 });
    const { passwordHash, ...rest } = customer;
    return Response.json({ customer: { ...rest, hasPassword: Boolean(passwordHash) } });
  } catch (error) {
    return apiErrorResponse('customer-me', error);
  }
}

/**
 * Update profile: name and/or contact, or change password.
 * Password change requires the current password (or an account created via Google,
 * which can set a first password without one).
 */
export async function PATCH(request: Request) {
  try {
    const customerId = requireCustomer();
    const body = await request.json().catch(() => ({}));
    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2) return Response.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      data.name = name;
    }

    if (typeof body.contact === 'string' && body.contact.trim()) {
      const normalized = normalizeContact(body.contact);
      if (!normalized) return Response.json({ error: 'Enter a valid email or phone' }, { status: 400 });
      const clash = await db.customer.findFirst({
        where: { id: { not: customerId }, OR: [{ email: normalized.value }, { phone: normalized.value }] },
        select: { id: true },
      });
      if (clash) return Response.json({ error: 'That email or phone is already used by another account' }, { status: 409 });
      if (normalized.kind === 'email') { data.email = normalized.value; data.phone = null; }
      else { data.phone = normalized.value; data.email = null; }
    }

    if (typeof body.newPassword === 'string' && body.newPassword) {
      if (body.newPassword.length < 6) return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      const current = await db.customer.findUnique({ where: { id: customerId }, select: { passwordHash: true } });
      if (current?.passwordHash) {
        if (typeof body.currentPassword !== 'string' || !verifyCustomerPassword(body.currentPassword, current.passwordHash)) {
          return Response.json({ error: 'Your current password is incorrect' }, { status: 401 });
        }
      }
      data.passwordHash = hashCustomerPassword(body.newPassword);
    }

    if (Object.keys(data).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const customer = await db.customer.update({
      where: { id: customerId },
      data,
      select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
    });

    const response = Response.json({ ok: true, customer });
    // Refresh the session so contact changes take effect immediately.
    response.headers.append('Set-Cookie', customerSessionCookie(createCustomerSession(customer.id)));
    return response;
  } catch (error) {
    return apiErrorResponse('customer-me-update', error);
  }
}
