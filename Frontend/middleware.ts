import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Page auth is handled in the dashboard layout (client).
 * Middleware only enforces a token for protected API routes so RSC/page
 * navigations are not bounced to /login when cookie edge-cases occur.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect HTML/RSC page navigations from here.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const publicApiRoutes = [
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/logout",
    "/api/health",
  ];

  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;
  const cookieToken = request.cookies.get("token")?.value;
  const token = bearer || cookieToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
