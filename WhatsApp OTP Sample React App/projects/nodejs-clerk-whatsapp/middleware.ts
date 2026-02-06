/**
 * Next.js middleware for authentication and WhatsApp 2FA enforcement.
 *
 * @description This middleware runs on every request and implements a two-layer
 * authentication system:
 *
 * 1. **Clerk Authentication**: Primary sign-in via email/password or OAuth
 * 2. **WhatsApp 2FA**: Secondary verification via OTP sent to WhatsApp
 *
 * Route categories:
 * - **Public routes** (`/`, `/sign-in`, `/sign-up`): No authentication required
 * - **Verify route** (`/verify-whatsapp`): Requires Clerk auth only
 * - **Protected routes** (`/dashboard`, `/settings`): Requires both Clerk auth AND WhatsApp 2FA
 *
 * The middleware checks session claims for `whatsapp_2fa_enabled` flag, which is
 * set in Clerk's publicMetadata after successful OTP verification and exposed
 * via custom session claims configured in the Clerk Dashboard.
 *
 * @example
 * // Middleware automatically runs on matching routes
 * // User flow:
 * // 1. User visits /dashboard (unauthenticated)
 * // 2. Middleware redirects to /sign-in
 * // 3. User signs in via Clerk
 * // 4. Middleware checks 2FA status, redirects to /verify-whatsapp?redirect_url=/dashboard
 * // 5. User completes WhatsApp verification
 * // 6. User gains access to /dashboard
 *
 * @see {@link app/verify-whatsapp/page.tsx} - WhatsApp verification page
 * @see {@link app/api/whatsapp-otp/verify/route.ts} - API that sets 2FA metadata
 *
 * @module middleware
 */
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Route matcher for fully protected routes requiring both Clerk auth and WhatsApp 2FA.
 *
 * @description Matches routes like `/dashboard`, `/dashboard/settings`, `/settings`, etc.
 */
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)']);

/**
 * Route matcher for the WhatsApp verification page.
 *
 * @description This route requires Clerk authentication but NOT WhatsApp 2FA,
 * as this is where users complete the 2FA process.
 */
const isVerifyRoute = createRouteMatcher(['/verify-whatsapp(.*)']);

/**
 * Route matcher for public routes requiring no authentication.
 *
 * @description These routes are accessible to all visitors including
 * the home page and Clerk's authentication pages.
 */
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

/**
 * Session claims metadata structure for WhatsApp 2FA status.
 *
 * @description This type represents the custom session claims exposed via
 * Clerk Dashboard configuration. The `metadata` claim must be configured
 * to expose `user.public_metadata`.
 */
interface WhatsApp2FASessionClaims {
  /** Whether WhatsApp 2FA has been completed for this session */
  whatsapp_2fa_enabled?: boolean;
}

/**
 * Clerk middleware with custom 2FA logic.
 *
 * @description Wraps the Clerk middleware to add WhatsApp 2FA enforcement.
 * For each request, it:
 * 1. Allows public routes without any checks
 * 2. Requires Clerk sign-in for all other routes
 * 3. Allows the verify-whatsapp page with just Clerk auth
 * 4. Requires WhatsApp 2FA for protected routes
 *
 * @param auth - Clerk auth helper providing user and session info
 * @param req - The incoming Next.js request
 * @returns Response to continue, redirect, or block the request
 */
export default clerkMiddleware(async (auth, req) => {
  const authObj = await auth();

  // Allow public routes
  if (isPublicRoute(req)) return;

  // All other routes require at least Clerk sign-in
  if (!authObj.userId) {
    return authObj.redirectToSignIn();
  }

  // The verify-whatsapp page itself only needs Clerk auth
  if (isVerifyRoute(req)) return;

  // Protected routes require WhatsApp 2FA
  if (isProtectedRoute(req)) {
    // Check the session claims for 2FA status
    const metadata = authObj.sessionClaims?.metadata as
      | WhatsApp2FASessionClaims
      | undefined;

    if (!metadata?.whatsapp_2fa_enabled) {
      // Redirect to WhatsApp verification with return URL
      const verifyUrl = new URL('/verify-whatsapp', req.url);
      verifyUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
      return NextResponse.redirect(verifyUrl);
    }
  }
});

/**
 * Middleware configuration specifying which routes to process.
 *
 * @description Defines the URL patterns that trigger this middleware.
 * The matcher configuration:
 * - Excludes Next.js internal routes (`_next`)
 * - Excludes static files (images, fonts, etc.)
 * - Always runs for API routes (`/api`, `/trpc`)
 *
 * This ensures the middleware only runs on actual page/API requests,
 * not on static asset requests for better performance.
 */
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
