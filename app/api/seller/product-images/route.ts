import { db } from '@/lib/prisma';
import { requireSeller } from '@/lib/seller-auth';
import { apiErrorResponse } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** NEW: seller-scoped gallery management. Every call verifies the product belongs to the signed-in seller. */
async function ownedProduct(sellerId: string, productId: unknown) {
  if (typeof productId !== 'string' || !/^[a-f0-9]{24}$/i.test(productId)) return null;
  return db.product.findFirst({ where: { id: productId, sellerId }, select: { id: true } });
}
async function activeSeller() {
  const sellerId = requireSeller();
  const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { status: true } });
  if (!seller || seller.status !== 'APPROVED') throw Response.json({ error: 'Seller account is not active' }, { status: 403 });
  return sellerId;
}
const validUrl = (value: unknown) => { try { const u = new URL(String(value)); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; } };

export async function GET(request: Request) {
  try {
    const sellerId = await activeSeller();
    const product = await ownedProduct(sellerId, new URL(request.url).searchParams.get('productId'));
    if (!product) return Response.json({ error: 'Product not found for this seller' }, { status: 404 });
    const images = await db.productImage.findMany({ where: { productId: product.id }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] });
    return Response.json({ images });
  } catch (error) { return apiErrorResponse('seller/product-images', error); }
}

export async function POST(request: Request) {
  try {
    const sellerId = await activeSeller();
    const { productId, url, altText, isPrimary } = await request.json();
    const product = await ownedProduct(sellerId, productId);
    if (!product) return Response.json({ error: 'Product not found for this seller' }, { status: 404 });
    if (!validUrl(url)) return Response.json({ error: 'A valid image URL is required' }, { status: 400 });
    const count = await db.productImage.count({ where: { productId: product.id } });
    const makePrimary = Boolean(isPrimary) || count === 0;
    const image = await db.$transaction(async tx => {
      if (makePrimary) await tx.productImage.updateMany({ where: { productId: product.id }, data: { isPrimary: false } });
      const created = await tx.productImage.create({ data: { productId: product.id, url, altText: typeof altText === 'string' && altText.trim() ? altText.trim() : null, sortOrder: count, isPrimary: makePrimary } });
      if (makePrimary) await tx.product.update({ where: { id: product.id }, data: { imageUrl: url } });
      return created;
    });
    return Response.json({ image }, { status: 201 });
  } catch (error) { return apiErrorResponse('seller/product-images', error); }
}

export async function PATCH(request: Request) {
  try {
    const sellerId = await activeSeller();
    const { id, isPrimary } = await request.json();
    const existing = typeof id === 'string' ? await db.productImage.findUnique({ where: { id } }) : null;
    if (!existing || !(await ownedProduct(sellerId, existing.productId))) return Response.json({ error: 'Image not found' }, { status: 404 });
    if (isPrimary) {
      await db.$transaction(async tx => {
        await tx.productImage.updateMany({ where: { productId: existing.productId }, data: { isPrimary: false } });
        await tx.productImage.update({ where: { id: existing.id }, data: { isPrimary: true } });
        await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: existing.url } });
      });
    }
    return Response.json({ ok: true });
  } catch (error) { return apiErrorResponse('seller/product-images', error); }
}

export async function DELETE(request: Request) {
  try {
    const sellerId = await activeSeller();
    const id = new URL(request.url).searchParams.get('id');
    const existing = id ? await db.productImage.findUnique({ where: { id } }) : null;
    if (!existing || !(await ownedProduct(sellerId, existing.productId))) return Response.json({ error: 'Image not found' }, { status: 404 });
    await db.$transaction(async tx => {
      await tx.productImage.delete({ where: { id: existing.id } });
      if (existing.isPrimary) {
        const next = await tx.productImage.findFirst({ where: { productId: existing.productId }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
        if (next) { await tx.productImage.update({ where: { id: next.id }, data: { isPrimary: true } }); await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: next.url } }); }
        else await tx.product.update({ where: { id: existing.productId }, data: { imageUrl: null } });
      }
    });
    return Response.json({ ok: true });
  } catch (error) { return apiErrorResponse('seller/product-images', error); }
}
