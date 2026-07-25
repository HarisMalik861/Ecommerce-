import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NOTE: JWT verification is intentionally NOT done here.
// The Next.js 16 nodejs proxy bundles this file separately and process.env
// values from .env.production may not be available at proxy bundle time,
// causing JWT_SECRET to fall back to 'fallback-secret-key' and silently
// reject every valid token. Full verification lives in individual API routes
// and in the dashboard layout's /api/auth/me call, where Node.js env is
// always correctly loaded at runtime.
//
// This middleware only guards against completely unauthenticated access
// (no cookie at all) so the UX is correct even on hard navigations.

export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/', '/login', '/signup', '/about', '/contact'];
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/logout',
    '/api/health',
  ];

  if (
    publicRoutes.includes(pathname) ||
    publicApiRoutes.some(r => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  // No cookie at all → definitely not logged in
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Token exists — trust it here, let the dashboard layout + API routes
  // do the full JWT signature check with the correct runtime secret.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
