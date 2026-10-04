import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { hashSellerPassword } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Everything the admin UI needs, and never the password hash. */
const sellerAdminSelect = {
  id: true,
  businessName: true,
  ownerName: true,
  phone: true,
  email: true,
  address: true,
  loginUsername: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} as const;

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

    const business = typeof businessName === 'string' ? businessName.trim() : '';
    const owner = typeof ownerName === 'string' ? ownerName.trim() : '';
    const sellerPhone = typeof phone === 'string' ? phone.trim() : '';
    const username = typeof loginUsername === 'string' ? loginUsername.trim() : '';
    const sellerPassword = typeof password === 'string' ? password : '';
    const sellerEmail = typeof email === 'string' ? email.trim() : '';
    const sellerAddress = typeof address === 'string' ? address.trim() : '';

    if (!business || !owner || !sellerPhone || !username || !sellerPassword) {
      return Response.json(
        { error: 'Business name, owner name, phone, username and password are required' },
        { status: 400 },
      );
    }

    if (sellerEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(sellerEmail)) {
      return Response.json({ error: 'Please enter a valid email address or leave email empty' }, { status: 400 });
    }

    if (sellerPassword.length < 8) {
      return Response.json({ error: 'Seller password must be at least 8 characters' }, { status: 400 });
    }

    if (username.length < 3) {
      return Response.json({ error: 'Seller username must be at least 3 characters' }, { status: 400 });
    }

    const existingUsername = await db.seller.findFirst({
      where: { loginUsername: username },
      select: { id: true },
    });

    if (existingUsername) {
      return Response.json({ error: 'Seller username is already in use' }, { status: 409 });
    }

    // Verify MongoDB is reachable before creating the seller. This separates
    // connection failures from data/index failures in the server logs.
    await db.$runCommandRaw({ ping: 1 });

    let seller;
    try {
      seller = await db.seller.create({
        data: {
          businessName: business,
          ownerName: owner,
          phone: sellerPhone,
          email: sellerEmail || null,
          address: sellerAddress || null,
          loginUsername: username,
          passwordHash: hashSellerPassword(sellerPassword),
          status: 'APPROVED',
        },
      });
    } catch (createError) {
      // Legacy Mongo indexes can surface as duplicate-key errors even though
      // the current Prisma schema does not mark those fields as unique.
      const message = createError instanceof Error ? createError.message : String(createError);
      if (/E11000|duplicate key|unique constraint/i.test(message)) {
        return Response.json(
          { error: 'A seller with this username already exists, or MongoDB still has a legacy unique index. Please retry after the database index repair.' },
          { status: 409 },
        );
      }
      throw createError;
    }

    return Response.json(
      {
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
      },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse('sellers', error);
  }
}

/**
 * Full seller management from the owner console.
 * Accepts { id, status?, businessName?, ownerName?, phone?, email?, address?, loginUsername?, newPassword? }
 * and updates only the provided fields, so it covers status changes, detail edits
 * and password resets with one admin-protected endpoint.
 */
export async function PATCH(request: Request) {
  try {
    requireAdmin();
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return Response.json({ error: 'A seller id is required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!['PENDING', 'APPROVED', 'SUSPENDED'].includes(body.status)) {
        return Response.json({ error: 'status must be PENDING, APPROVED or SUSPENDED' }, { status: 400 });
      }
      data.status = body.status;
    }

    for (const field of ['businessName', 'ownerName', 'phone'] as const) {
      if (body[field] !== undefined) {
        const value = String(body[field] ?? '').trim();
        if (!value) return Response.json({ error: `${field} cannot be empty` }, { status: 400 });
        data[field] = value;
      }
    }

    for (const field of ['email', 'address'] as const) {
      if (body[field] !== undefined) {
        const value = String(body[field] ?? '').trim();
        data[field] = value ? value : null;
      }
    }

    if (body.loginUsername !== undefined) {
      const username = String(body.loginUsername ?? '').trim();
      if (username.length < 3) {
        return Response.json({ error: 'Seller username must be at least 3 characters' }, { status: 400 });
      }

      const clash = await db.seller.findFirst({
        where: { loginUsername: username, id: { not: id } },
        select: { id: true },
      });

      if (clash) {
        return Response.json({ error: 'Seller username is already in use' }, { status: 409 });
      }

      data.loginUsername = username;
    }

    if (body.newPassword !== undefined) {
      const password = String(body.newPassword ?? '');
      if (password.length < 8) {
        return Response.json({ error: 'Seller password must be at least 8 characters' }, { status: 400 });
      }
      data.passwordHash = hashSellerPassword(password);
    }

    if (Object.keys(data).length === 0) {
      return Response.json(
        { error: 'Nothing to update: provide status, seller details or newPassword' },
        { status: 400 },
      );
    }

    const seller = await db.seller.update({
      where: { id },
      data,
      select: sellerAdminSelect,
    });

    return Response.json({ seller });
  } catch (error) {
    return apiErrorResponse('sellers', error);
  }
}
