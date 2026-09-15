import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'gwizineza_admin_session';

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return value;
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function createAdminSession() {
  const value = `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  return `${value}.${sign(value)}`;
}

export function isValidAdminSession(token?: string | null) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length < 3) return false;
  const signature = parts.pop()!;
  const value = parts.join('.');
  const expected = sign(value);
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function requireAdmin() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!isValidAdminSession(token)) {
    throw new Response(JSON.stringify({ error: 'Admin authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const adminCookieName = COOKIE_NAME;
