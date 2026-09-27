import { sellerCookieName } from '@/lib/seller-auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.append('Set-Cookie', `${sellerCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
