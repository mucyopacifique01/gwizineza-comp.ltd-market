import { Prisma } from '@prisma/client';

/**
 * Central error reporter for API routes. Logs the real error server-side
 * (visible in Netlify function logs) and returns a JSON body the client
 * can actually show, instead of a silent empty 500.
 */
export function apiErrorResponse(route: string, error: unknown): Response {
  console.error(`[api/${route}]`, error);

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return Response.json(
      {
        error:
          'Database connection failed. Check that DATABASE_URL is set correctly and that MongoDB Atlas allows connections from this server (Network Access / IP Access List).',
      },
      { status: 503 },
    );
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error';
  return Response.json({ error: message }, { status: 500 });
}
