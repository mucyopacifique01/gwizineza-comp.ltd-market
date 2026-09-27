import { db } from '@/lib/prisma';
import { createCustomerSession, customerSessionCookie } from '@/lib/customer-auth';
import { getPublicOrigin } from '@/lib/request-origin';

/** Step 2 of Google sign-up/in: exchange the code, find-or-create the customer, sign them in. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GoogleProfile = { sub: string; email?: string; name?: string; picture?: string };

function decodeIdToken(idToken: string): GoogleProfile | null {
  const part = idToken.split('.')[1];
  if (!part) return null;
  const json = Buffer.from(part, 'base64url').toString('utf8');
  const parsed = JSON.parse(json) as GoogleProfile;
  return parsed?.sub ? parsed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicOrigin(request);
  const code = url.searchParams.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return Response.redirect(`${origin}/auth?error=google-failed`, 302);
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/customer/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) throw new Error('token exchange failed');
    const tokens = (await tokenResponse.json()) as { id_token?: string };
    const profile = tokens.id_token ? decodeIdToken(tokens.id_token) : null;
    if (!profile) throw new Error('no profile in id_token');

    const email = profile.email?.toLowerCase() ?? null;

    // Find by Google id, then by email (linking an existing account), otherwise create.
    let customer = await db.customer.findUnique({ where: { googleId: profile.sub }, select: { id: true } });
    if (!customer && email) {
      customer = await db.customer.findUnique({ where: { email }, select: { id: true } });
      if (customer) {
        await db.customer.update({ where: { id: customer.id }, data: { googleId: profile.sub } });
      }
    }
    if (!customer) {
      const created = await db.customer.create({
        data: {
          name: profile.name?.trim() || 'Customer',
          email,
          googleId: profile.sub,
          avatarUrl: profile.picture ?? null,
        },
        select: { id: true },
      });
      customer = created;
    }

    const response = Response.redirect(`${origin}/auth?signedIn=1`, 302);
    response.headers.append('Set-Cookie', customerSessionCookie(createCustomerSession(customer.id)));
    return response;
  } catch (error) {
    console.error('[customer-google-callback]', error);
    return Response.redirect(`${origin}/auth?error=google-failed`, 302);
  }
}
