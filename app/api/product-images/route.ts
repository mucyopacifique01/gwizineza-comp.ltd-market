import { db } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) return Response.json({ error: 'productId is required' }, { status: 400 });

  const images = await db.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return Response.json({ images });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { productId, url, altText, isPrimary } = body;

  if (!productId || typeof url !== 'string' || !isValidHttpUrl(url)) {
    return Response.json({ error: 'productId and a valid image URL are required' }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });

  const imageCount = await db.productImage.count({ where: { productId } });
  const makePrimary = Boolean(isPrimary) || imageCount === 0;

  const image = await db.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    }

    const created = await tx.productImage.create({
      data: {
        productId,
        url,
        altText: typeof altText === 'string' && altText.trim() ? altText.trim() : null,
        sortOrder: imageCount,
        isPrimary: makePrimary,
      },
    });

    if (makePrimary) {
      await tx.product.update({ where: { id: productId }, data: { imageUrl: url } });
    }

    return created;
  });

  return Response.json({ image }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, url, altText, sortOrder, isPrimary } = body;
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  const existing = await db.productImage.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'Image not found' }, { status: 404 });

  if (url !== undefined && (typeof url !== 'string' || !isValidHttpUrl(url))) {
    return Response.json({ error: 'url must be a valid http(s) URL' }, { status: 400 });
  }

  const makePrimary = Boolean(isPrimary);
  const image = await db.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.productImage.updateMany({ where: { productId: existing.productId }, data: { isPrimary: false } });
    }

    const updated = await tx.productImage.update({
      where: { id },
      data: {
        ...(url !== undefined ? { url } : {}),
        ...(altText !== undefined ? { altText: typeof altText === 'string' && altText.trim() ? altText.trim() : null } : {}),
        ...(Number.isInteger(sortOrder) ? { sortOrder } : {}),
        ...(isPrimary !== undefined ? { isPrimary: makePrimary } : {}),
      },
    });

    if (makePrimary) {
      await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: updated.url } });
    }

    return updated;
  });

  return Response.json({ image });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

  const existing = await db.productImage.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'Image not found' }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id } });

    if (existing.isPrimary) {
      const next = await tx.productImage.findFirst({
        where: { productId: existing.productId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      if (next) {
        await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } });
        await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: next.url } });
      } else {
        await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: null } });
      }
    }
  });

  return Response.json({ ok: true });
}
