import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { createCustomerSession, customerSessionCookie } from '@/lib/customer-auth';
import { getPublicOrigin } from '@/lib/request-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stateCookie = 'gwizineza-google-state';

type GoogleProfile = { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie') || '';
  const part = header.split(';').map(value => value.trim()).find(value => value.startsWith(name + '='));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

function clearStateCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${stateCookie}=; HttpOnly; SameSite=Lax; Path=/api/customer/auth/google; Max-Age=0${secure}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicOrigin(request);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, stateCookie);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret || !state || !expectedState || state !== expectedState) {
    const response = Response.redirect(`${origin}/auth?error=google-failed`, 302);
    response.headers.append('Set-Cookie', clearStateCookie());
    return response;
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

    if (!tokenResponse.ok) {
      const detail = await tokenResponse.text().catch(() => '');
      throw new Error(`Google token exchange failed (${tokenResponse.status}): ${detail.slice(0, 240)}`);
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error('Google did not return an access token');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: 'no-store',
    });
    if (!profileResponse.ok) {
      const detail = await profileResponse.text().catch(() => '');
      throw new Error(`Google profile request failed (${profileResponse.status}): ${detail.slice(0, 240)}`);
    }

    const profile = (await profileResponse.json()) as GoogleProfile;
    if (!profile.sub || !profile.email) throw new Error('Google profile did not include the required account identity');
    if (profile.email_verified === false) throw new Error('Google email is not verified');

    const email = profile.email.trim().toLowerCase();
    const name = profile.name?.trim() || 'Customer';
    const avatarUrl = profile.picture?.trim() || null;

    let customer = await db.customer.findUnique({
      where: { googleId: profile.sub },
      select: { id: true },
    });

    if (customer) {
      await db.customer.update({
        where: { id: customer.id },
        data: { name, email, avatarUrl },
      });
    } else {
      const byEmail = await db.customer.findUnique({ where: { email }, select: { id: true } });
      if (byEmail) {
        await db.customer.update({
          where: { id: byEmail.id },
          data: { googleId: profile.sub, name, avatarUrl },
        });
        customer = byEmail;
      } else {
        try {
          const created = await db.customer.create({
            data: { name, email, googleId: profile.sub, avatarUrl },
            select: { id: true },
          });
          customer = created;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const raced = await db.customer.findFirst({
              where: { OR: [{ googleId: profile.sub }, { email }] },
              select: { id: true },
            });
            if (!raced) throw error;
            await db.customer.update({ where: { id: raced.id }, data: { googleId: profile.sub, name, email, avatarUrl } });
            customer = raced;
          } else {
            throw error;
          }
        }
      }
    }

    if (!customer?.id) throw new Error('Customer account could not be saved');

    console.info('[customer-google-callback] customer persisted', { customerId: customer.id, email });

    const response = Response.redirect(`${origin}/auth?signedIn=1`, 302);
    response.headers.append('Set-Cookie', clearStateCookie());
    response.headers.append('Set-Cookie', customerSessionCookie(createCustomerSession(customer.id)));
    return response;
  } catch (error) {
    console.error('[customer-google-callback] failed', error);
    const response = Response.redirect(`${origin}/auth?error=google-failed`, 302);
    response.headers.append('Set-Cookie', clearStateCookie());
    return response;
  }
}
