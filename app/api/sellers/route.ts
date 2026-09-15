import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  requireAdmin();
  const sellers = await db.seller.findMany({ include: { _count: { select: { products: true } } }, orderBy: { createdAt: 'desc' } });
  return Response.json({ sellers });
}

export async function POST(request: Request) {
  requireAdmin();
  const body = await request.json();
  const { businessName, ownerName, phone, email, address } = body;
  if (!businessName || !ownerName || !phone) return Response.json({ error: 'businessName, ownerName and phone are required' }, { status: 400 });
  const seller = await db.seller.create({ data: { businessName, ownerName, phone, email: email || null, address: address || null, status: 'PENDING' } });
  return Response.json({ seller }, { status: 201 });
}

export async function PATCH(request: Request) {
  requireAdmin();
  const body = await request.json();
  const { id, status } = body;
  if (!id || !['PENDING', 'APPROVED', 'SUSPENDED'].includes(status)) return Response.json({ error: 'id and a valid seller status are required' }, { status: 400 });
  const seller = await db.seller.update({ where: { id }, data: { status } });
  return Response.json({ seller });
}
