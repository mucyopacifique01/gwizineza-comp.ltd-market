import { createHash, timingSafeEqual } from 'crypto';
import { createAdminSession, adminCookieName } from '@/lib/admin-auth';

export const runtime = 'nodejs';

/** Constant-time comparison so the admin password can't be probed by response timing. */
function matchesAdminPassword(password: string, expected: string) {
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || !password || !matchesAdminPassword(password, expected)) {
    return Response.json({ error: 'Invalid admin password' }, { status: 401 });
  }

  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', `${adminCookieName}=${createAdminSession()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
  return response;
}
