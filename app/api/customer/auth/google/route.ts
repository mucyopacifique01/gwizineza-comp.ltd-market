import { randomUUID } from 'crypto';
import { getPublicOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stateCookie = 'gwizineza-google-state';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const origin = getPublicOrigin(request);
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return Response.redirect(`${origin}/auth?error=google-not-configured`, 302);
  }

  const state = randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/customer/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  const response = Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.headers.append(
    'Set-Cookie',
    `${stateCookie}=${state}; HttpOnly; SameSite=Lax; Path=/api/customer/auth/google; Max-Age=600${secure}`,
  );
  return response;
}
