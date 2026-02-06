import { SignUp } from '@clerk/nextjs';

/**
 * Sign-up page component for new user registration.
 *
 * @description This page provides a full-page sign-up experience using Clerk's
 * pre-built SignUp component. It handles new user registration with various
 * authentication methods configured in Clerk.
 *
 * The page uses Next.js catch-all routing (`[[...sign-up]]`) to handle:
 * - `/sign-up` - Main registration page
 * - `/sign-up/verify-email-address` - Email verification step
 * - `/sign-up/verify-phone-number` - Phone verification step
 * - `/sign-up/sso-callback` - OAuth registration callback
 *
 * After successful registration, new users are redirected based on Clerk's
 * configuration. When accessing protected routes, the middleware will require
 * WhatsApp 2FA verification as an additional security layer.
 *
 * @example
 * // Direct navigation to sign-up page
 * // URL: /sign-up
 *
 * @see {@link app/(auth)/sign-in/[[...sign-in]]/page.tsx} - Sign-in page for existing users
 * @see {@link app/verify-whatsapp/page.tsx} - WhatsApp 2FA after registration
 * @see {@link middleware.ts} - Route protection and redirects
 *
 * @returns The Clerk SignUp component centered on the page
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
