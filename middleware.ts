import { NextRequest, NextResponse } from 'next/server';

/**
 * Cheap edge redirect when no session cookie is present. Real authorization still happens
 * in every API route (requireAdmin / requireSeller) — this only improves UX.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!request.cookies.get('gwizineza_admin_session')) return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  if (pathname.startsWith('/seller') && pathname !== '/seller/login') {
    if (!request.cookies.get('gwizineza_seller_session')) return NextResponse.redirect(new URL('/seller/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/seller/:path*'] };
