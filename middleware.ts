import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/** Next.js is the presentation layer. All /api requests are proxied to Django. */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!request.cookies.get('gwizineza_admin_session')) return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (pathname.startsWith('/seller') && pathname !== '/seller/login') {
    if (!request.cookies.get('gwizineza_seller_session')) return NextResponse.redirect(new URL('/seller/login', request.url));
  }

  if (!pathname.startsWith('/api/')) return NextResponse.next();

  const backendUrl = process.env.DJANGO_API_URL?.trim();
  if (!backendUrl) {
    return NextResponse.json({ error: 'Set DJANGO_API_URL on the frontend service to connect Django.' }, { status: 503 });
  }

  const requestHeaders = new Headers(request.headers);
  let refreshedCookies: Array<{ name: string; value: string; options?: unknown }> = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: unknown }>) {
          refreshedCookies = cookiesToSet;
          for (const cookie of cookiesToSet) request.cookies.set(cookie.name, cookie.value);
        },
      },
    });
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) requestHeaders.set('Authorization', 'Bearer ' + data.session.access_token);
    else requestHeaders.delete('Authorization');
  }

  const destination = new URL(pathname + search, backendUrl.endsWith('/') ? backendUrl : backendUrl + '/');
  const response = NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  for (const cookie of refreshedCookies) response.cookies.set(cookie.name, cookie.value, cookie.options as never);
  return response;
}

export const config = { matcher: ['/api/:path*', '/admin/:path*', '/seller/:path*'] };
