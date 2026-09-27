import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'gwizineza_customer_session';
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days for shoppers

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return value;
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function hashCustomerPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyCustomerPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createCustomerSession(customerId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const value = `${customerId}.${expires}.${randomBytes(12).toString('base64url')}`;
  return `${value}.${sign(value)}`;
}

export function getCustomerSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 4) return null;
  const signature = parts.pop()!;
  const value = parts.join('.');
  const expected = sign(value);
  if (signature.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const [customerId, expires] = value.split('.');
  if (!customerId || !expires || Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return customerId;
}

export function requireCustomer() {
  const customerId = getCustomerSession();
  if (!customerId) {
    throw new Response(JSON.stringify({ error: 'Customer authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return customerId;
}

export const customerCookieName = COOKIE_NAME;

export function customerSessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

/** Accepts an email or phone number and normalizes it. Returns null for junk input. */
export function normalizeContact(raw: string): { kind: 'email' | 'phone'; value: string } | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { kind: 'email', value } : null;
  }
  const digits = value.replace(/[\s()\-.]/g, '');
  if (digits.startsWith('+')) return { kind: 'phone', value: digits };
  if (/^\d{9,13}$/.test(digits)) return { kind: 'phone', value: `+${digits.replace(/^0/, '250')}` };
  return null;
}
