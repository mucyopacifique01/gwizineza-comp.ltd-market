import { db } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.$runCommandRaw({ ping: 1 });
    return Response.json({ ok: true, service: 'gwizineza-market', database: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('[health] database check failed', error);
    return Response.json({ ok: false, service: 'gwizineza-market', database: 'unavailable' }, { status: 503 });
  }
}
