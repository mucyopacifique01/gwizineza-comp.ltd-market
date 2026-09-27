import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CustomerRow = {
  phone: string;
  name: string;
  email: string | null;
  lastAddress: string;
  orders: number;
  spentRwf: number;
  lastOrderAt: string;
  registered: boolean;
  account: 'Google' | 'Password' | null;
};

/** Owner console: registered customer accounts merged with checkout details, grouped by phone/email. */
export async function GET() {
  try {
    requireAdmin();
    const [orders, customers] = await Promise.all([
      db.order.findMany({
        select: { phone: true, customerName: true, customerEmail: true, deliveryAddress: true, totalRwf: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      db.customer.findMany({
        select: { name: true, email: true, phone: true, googleId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const map = new Map<string, CustomerRow>();
    const keyFor = (phone: string, email?: string | null) => (phone || email || '').toLowerCase();

    for (const order of orders) {
      const key = keyFor(order.phone, order.customerEmail);
      if (!key) continue;
      const entry = map.get(key);
      if (!entry) {
        map.set(key, {
          phone: order.phone,
          name: order.customerName,
          email: order.customerEmail ?? null,
          lastAddress: order.deliveryAddress,
          orders: 1,
          spentRwf: order.status === 'CANCELLED' ? 0 : order.totalRwf,
          lastOrderAt: order.createdAt.toISOString(),
          registered: false,
          account: null,
        });
      } else {
        entry.orders += 1;
        if (order.status !== 'CANCELLED') entry.spentRwf += order.totalRwf;
        if (!entry.email && order.customerEmail) entry.email = order.customerEmail;
      }
    }

    // Merge registered customer accounts (matched by phone or email) and add account-only ones.
    for (const customer of customers) {
      const account = customer.googleId ? 'Google' : 'Password';
      let entry = customer.phone ? map.get(keyFor(customer.phone)) : undefined;
      if (!entry && customer.email) {
        entry = Array.from(map.values()).find(e => e.email === customer.email);
      }
      if (entry) {
        entry.registered = true;
        entry.account = account;
        if (!entry.email && customer.email) entry.email = customer.email;
        if (!entry.phone && customer.phone) entry.phone = customer.phone;
      } else {
        map.set(keyFor(customer.phone ?? customer.email ?? ''), {
          phone: customer.phone ?? '—',
          name: customer.name,
          email: customer.email,
          lastAddress: '—',
          orders: 0,
          spentRwf: 0,
          lastOrderAt: customer.createdAt.toISOString(),
          registered: true,
          account,
        });
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => Number(b.registered) - Number(a.registered) || b.orders - a.orders);
    return Response.json({ customers: list });
  } catch (error) {
    return apiErrorResponse('admin/customers', error);
  }
}
