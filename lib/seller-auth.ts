import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'gwizineza_seller_session';
const SESSION_TTL = 60 * 60 * 24;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error('ADMIN_SESSION_SECRET is not configured');
  return value;
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function hashSellerPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySellerPassword(password: string, stored: string) {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSellerSession(sellerId: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const value = `${sellerId}.${expires}.${randomBytes(12).toString('base64url')}`;
  return `${value}.${sign(value)}`;
}

export function getSellerSession() {
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
  const [sellerId, expires] = value.split('.');
  if (!sellerId || !expires || Number(expires) < Math.floor(Date.now() / 1000)) return null;
  return sellerId;
}

export function requireSeller() {
  const sellerId = getSellerSession();
  if (!sellerId) {
    throw new Response(JSON.stringify({ error: 'Seller authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return sellerId;
}

export const sellerCookieName = COOKIE_NAME;
