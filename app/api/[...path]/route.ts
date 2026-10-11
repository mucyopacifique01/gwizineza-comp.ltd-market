import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest) {
  const base = process.env.DJANGO_API_URL?.replace(/\/+$/, '');
  if (!base) {
    return Response.json({
      error: 'Django API is not configured. Set DJANGO_API_URL to the deployed Django service URL.',
    }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const target = base + incoming.pathname + incoming.search;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set('accept-encoding', 'identity');
  headers.set('x-forwarded-host', request.headers.get('host') || incoming.host);
  headers.set('x-forwarded-proto', incoming.protocol.replace(':', ''));

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const payload = request.method === 'HEAD' ? null : await upstream.arrayBuffer();
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return; // copied individually below so multiple cookies survive
      // Length/encoding headers describe the upstream wire format, not the decoded bytes we return.
      if (!['connection', 'transfer-encoding', 'content-encoding', 'content-length', 'keep-alive'].includes(key.toLowerCase())) {
        responseHeaders.append(key, value);
      }
    });
    const cookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    cookies.forEach(c => responseHeaders.append('set-cookie', c));
    if (payload) responseHeaders.set('content-length', String(payload.byteLength));
    return new Response(payload, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ error: 'Django API is unavailable. Check the backend deployment.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
