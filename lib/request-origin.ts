/**
 * Resolves this deployment's own public origin (e.g. https://gwizineza-company-ltd.onrender.com).
 *
 * request.url alone is unreliable behind Render's proxy: the app only sees the
 * internal address it's actually bound to (e.g. http://localhost:10000), not the
 * public HTTPS domain. Prefer an explicit APP_URL, then the standard forwarded
 * headers Render sets, then request.url as a last resort (e.g. local `next dev`).
 */
export function getPublicOrigin(request: Request): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) return `${proto}://${host}`;

  return new URL(request.url).origin;
}
