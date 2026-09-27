import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { hashSellerPassword } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

/** Everything the admin UI needs, and never the password hash. */
const sellerAdminSelect = {
  id: true, businessName: true, ownerName: true, phone: true, email: true, address: true,
  loginUsername: true, status: true, createdAt: true, updatedAt: true,
  _count: { select: { products: true } },
} as const;
export const runtime = 'nodejs';

export async function GET() {
  try {
    requireAdmin();
    const sellers = await db.seller.findMany({
      select: sellerAdminSelect,
      orderBy: { createdAt: 'desc' },
    });
    return Response.json({ sellers });
  } catch (error) {
    return apiErrorResponse('sellers', error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdmin();
    const body = await request.json();
    const { businessName, ownerName, phone, email, address, loginUsername, password } = body;

    if (!businessName || !ownerName || !phone || !loginUsername || !password) {
      return Response.json({ error: 'businessName, ownerName, phone, loginUsername and password are required' }, { status: 400 });
    }

    if (String(password).length < 8) {
      return Response.json({ error: 'Seller password must be at least 8 characters' }, { status: 400 });
    }

    const username = String(loginUsername).trim();
    if (username.length < 3) {
      return Response.json({ error: 'Seller username must be at least 3 characters' }, { status: 400 });
    }

    const existingUsername = await db.seller.findFirst({ where: { loginUsername: username }, select: { id: true } });
    if (existingUsername) {
      return Response.json({ error: 'Seller username is already in use' }, { status: 409 });
    }

    const seller = await db.seller.create({
      data: {
        businessName: String(businessName).trim(),
        ownerName: String(ownerName).trim(),
        phone: String(phone).trim(),
        email: typeof email === 'string' && email.trim() ? email.trim() : null,
        address: typeof address === 'string' && address.trim() ? address.trim() : null,
        loginUsername: username,
        passwordHash: hashSellerPassword(String(password)),
        status: 'PENDING',
      },
    });

    return Response.json({
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        ownerName: seller.ownerName,
        phone: seller.phone,
        email: seller.email,
        address: seller.address,
        loginUsername: seller.loginUsername,
        status: seller.status,
      },
    }, { status: 201 });
  } catch (error) {
    return apiErrorResponse('sellers', error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin();
    const body = await request.json();
    const { id, status } = body;
    if (!id || !['PENDING', 'APPROVED', 'SUSPENDED'].includes(status)) {
      return Response.json({ error: 'id and a valid seller status are required' }, { status: 400 });
    }

    const seller = await db.seller.update({
      where: { id },
      data: { status },
      select: sellerAdminSelect,
    });

    return Response.json({ seller });
  } catch (error) {
    return apiErrorResponse('sellers', error);
  }
}
