/**
 * @fileoverview Next.js middleware for route protection and authentication.
 *
 * This middleware runs on every request (except static assets) and enforces
 * authentication by verifying JWT session tokens. It protects sensitive routes
 * like /dashboard while allowing public access to login and OTP endpoints.
 *
 * @module middleware
 * @see {@link lib/session} - Session management utilities used for verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/** Secret key for JWT verification, must match the signing key in session.ts */
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/** Name of the session cookie to read */
const COOKIE_NAME = 'session';

/**
 * Routes that are accessible without authentication.
 * Includes the login page and OTP API endpoints.
 */
const publicRoutes = ['/', '/api/otp/send', '/api/otp/verify'];

/**
 * Routes that require a valid session to access.
 * Users without a valid session are redirected to the login page.
 */
const protectedRoutes = ['/dashboard'];

/**
 * Next.js middleware function that runs on every matching request.
 *
 * Authentication flow:
 * 1. Check if the requested path is a public route - allow access
 * 2. Check if the requested path is a protected route
 * 3. If protected, verify the session cookie contains a valid JWT
 * 4. Redirect to login if no token or invalid token
 * 5. Allow access if token is valid
 *
 * @async
 * @param {NextRequest} request - The incoming request object
 * @returns {Promise<NextResponse>} Either continues to the route or redirects
 *
 * @example
 * ```typescript
 * // This middleware is automatically invoked by Next.js
 * // Configuration is done via the `config` export below
 * ```
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith('/api/otp'))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Verify session
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

/**
 * Middleware configuration specifying which routes should be processed.
 *
 * This matcher excludes Next.js static assets and internal routes,
 * applying the middleware only to application routes.
 *
 * @constant
 * @type {{ matcher: string[] }}
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
