import { Prisma } from '@prisma/client';

/**
 * Central error reporter for API routes.
 * - Auth helpers (requireAdmin / requireSeller) throw a ready-made Response: pass it through.
 * - The real error is logged server-side only. Clients get a friendly, non-sensitive message.
 */
export function apiErrorResponse(route: string, error: unknown): Response {
  if (error instanceof Response) return error;

  console.error(`[api/${route}]`, error);

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return Response.json({ error: 'Our store is temporarily unavailable. Please try again in a moment.' }, { status: 503 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return Response.json({ error: 'This record already exists. Check the SKU, slug or username.' }, { status: 409 });
    if (error.code === 'P2025') return Response.json({ error: 'Record not found.' }, { status: 404 });
    if (error.code === 'P2023') return Response.json({ error: 'Invalid identifier.' }, { status: 400 });
  }

  return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}
