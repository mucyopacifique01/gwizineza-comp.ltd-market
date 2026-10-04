import { db } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness probe for the Render health check.
 * Always responds 200 when the Next.js server itself is up, and reports the
 * database reachability in the body. Returning 503 when the database is down
 * made Render kill the instance in a crash loop, so the whole site turned
 * into 502s instead of showing the app's friendly error states.
 */
export async function GET() {
  try {
    await db.$runCommandRaw({ ping: 1 });
    return Response.json({ ok: true, service: 'gwizineza-market', database: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[health] database check failed', error);
    return Response.json({ ok: false, service: 'gwizineza-market', database: 'unavailable' }, { status: 200 });
  }
}
