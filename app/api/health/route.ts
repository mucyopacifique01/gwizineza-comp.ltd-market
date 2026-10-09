export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness endpoint for the Next.js service. Always answers 200 so the hosting
 * health check never restart-loops the frontend while the backend or database
 * is temporarily unavailable; backend/database status is reported in the body
 * and every page already degrades gracefully without them.
 */
export async function GET() {
  const base = process.env.DJANGO_API_URL?.replace(/\/+$/, '');
  let backendStatus = 'unconfigured';
  let databaseStatus = 'unknown';
  if (base) {
    try {
      const response = await fetch(base + '/api/health', {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { databaseStatus?: string; backend?: string };
        backendStatus = body.backend ? 'ok' : 'reachable';
        databaseStatus = body.databaseStatus ?? 'unknown';
      } else {
        backendStatus = 'error';
      }
    } catch {
      backendStatus = 'unavailable';
    }
  }
  return Response.json({
    ok: true,
    service: 'gwizineza-market',
    frontend: 'Next.js',
    backend: 'Django',
    backendStatus,
    database: 'Supabase PostgreSQL',
    databaseStatus,
    time: new Date().toISOString(),
  });
}
