import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function safeMessage(message: string) {
  return message
    .replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://***@')
    .replace(/password=([^&\s]+)/gi, 'password=***');
}

export async function GET() {
  try {
    requireAdmin();
    await db.$runCommandRaw({ ping: 1 });
    return Response.json({ ok: true, database: 'MongoDB reachable' });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const code = 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : undefined;

    console.error('[api/admin/diagnostics/database]', err);

    return Response.json({
      ok: false,
      database: 'MongoDB check failed',
      error: {
        name: err.name,
        code,
        message: safeMessage(err.message),
      },
    }, { status: 503 });
  }
}
