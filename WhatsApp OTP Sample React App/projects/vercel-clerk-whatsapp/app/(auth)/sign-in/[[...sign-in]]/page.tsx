import { SignIn } from '@clerk/nextjs';

/**
 * Sign-In Page Component.
 *
 * @description This page renders Clerk's pre-built SignIn component, providing
 * a complete authentication UI for users to sign in to the application.
 * It supports various authentication methods configured in the Clerk dashboard
 * (email/password, OAuth providers, etc.).
 *
 * **Authentication Flow:**
 * 1. User navigates to /sign-in or is redirected here when accessing protected routes
 * 2. User completes sign-in via Clerk's SignIn component
 * 3. After successful sign-in, user is redirected to the intended destination
 * 4. If accessing a 2FA-protected route, middleware redirects to /verify-whatsapp
 *
 * This page uses Next.js catch-all route segments (`[[...sign-in]]`) to handle
 * Clerk's multi-step authentication flows and OAuth callbacks.
 *
 * @returns The sign-in page with centered Clerk SignIn component
 *
 * @see {@link SignUpPage} - Companion page for new user registration
 * @see {@link VerifyWhatsAppPage} - Next step after sign-in for 2FA-protected routes
 * @see {@link Home} - Landing page with SignInButton modal alternative
 *
 * @example
 * // This component is rendered at /sign-in
 * // The catch-all route handles paths like:
 * // - /sign-in
 * // - /sign-in/factor-one
 * // - /sign-in/sso-callback
 */
export default function SignInPage() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <SignIn />
    </div>
  );
}
