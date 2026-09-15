import { adminCookieName } from '@/lib/admin-auth';

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', `${adminCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
