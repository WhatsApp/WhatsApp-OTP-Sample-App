import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Routes that require Clerk auth AND WhatsApp 2FA
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)']);

// Routes that only need Clerk auth (no 2FA)
const isVerifyRoute = createRouteMatcher(['/verify-whatsapp(.*)']);

// Public routes (no auth at all)
const isPublicRoute = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)']);

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
      | {
          whatsapp_2fa_enabled?: boolean;
        }
      | undefined;

    if (!metadata?.whatsapp_2fa_enabled) {
      // Redirect to WhatsApp verification with return URL
      const verifyUrl = new URL('/verify-whatsapp', req.url);
      verifyUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
      return NextResponse.redirect(verifyUrl);
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
