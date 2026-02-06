import { SignUp } from '@clerk/nextjs';

/**
 * Sign-Up Page Component.
 *
 * @description This page renders Clerk's pre-built SignUp component, providing
 * a complete registration UI for new users to create an account. It supports
 * various authentication methods configured in the Clerk dashboard
 * (email/password, OAuth providers, etc.).
 *
 * **Registration Flow:**
 * 1. User navigates to /sign-up
 * 2. User completes registration via Clerk's SignUp component
 * 3. After successful registration, user is signed in and redirected
 * 4. If accessing a 2FA-protected route, middleware redirects to /verify-whatsapp
 *
 * This page uses Next.js catch-all route segments (`[[...sign-up]]`) to handle
 * Clerk's multi-step registration flows (email verification, OAuth callbacks, etc.).
 *
 * @returns The sign-up page with centered Clerk SignUp component
 *
 * @see {@link SignInPage} - Companion page for existing user authentication
 * @see {@link VerifyWhatsAppPage} - Next step after registration for 2FA-protected routes
 * @see {@link Home} - Landing page with sign-in option
 *
 * @example
 * // This component is rendered at /sign-up
 * // The catch-all route handles paths like:
 * // - /sign-up
 * // - /sign-up/verify-email-address
 * // - /sign-up/sso-callback
 */
export default function SignUpPage() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <SignUp />
    </div>
  );
}
