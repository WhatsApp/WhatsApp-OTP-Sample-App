import { SignIn } from '@clerk/nextjs';

/**
 * Sign-in page component for Clerk authentication.
 *
 * @description This page provides a full-page sign-in experience using Clerk's
 * pre-built SignIn component. It serves as an alternative to the modal sign-in
 * available on the home page.
 *
 * The page uses Next.js catch-all routing (`[[...sign-in]]`) to handle:
 * - `/sign-in` - Main sign-in page
 * - `/sign-in/factor-one` - First factor verification
 * - `/sign-in/factor-two` - Second factor verification (Clerk's built-in 2FA)
 * - `/sign-in/sso-callback` - OAuth callback handling
 *
 * After successful sign-in, users are redirected based on Clerk's configuration.
 * If WhatsApp 2FA is required for protected routes, users will be redirected
 * to the verification page by the middleware.
 *
 * @example
 * // Direct navigation to sign-in page
 * // URL: /sign-in
 *
 * @see {@link app/(auth)/sign-up/[[...sign-up]]/page.tsx} - Sign-up page
 * @see {@link app/verify-whatsapp/page.tsx} - WhatsApp 2FA after Clerk auth
 * @see {@link middleware.ts} - Route protection and redirects
 *
 * @returns The Clerk SignIn component centered on the page
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
