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
    if (error.code === 'P1001' || error.code === 'P1002') {
      return Response.json({ error: 'MongoDB is temporarily unreachable. Please try again in a moment.' }, { status: 503 });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return Response.json({ error: 'The database request was invalid. Please check the submitted fields and try again.' }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/E11000|duplicate key|unique constraint/i.test(message)) {
    return Response.json({ error: 'This record conflicts with an existing MongoDB index. Please retry after the database index repair.' }, { status: 409 });
  }
  if (/MongoServerSelectionError|ServerSelectionTimeoutError|ECONNREFUSED|ENOTFOUND|MongoNetworkError/i.test(message)) {
    return Response.json({ error: 'MongoDB is temporarily unreachable. Please try again in a moment.' }, { status: 503 });
  }

  return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 });
}
