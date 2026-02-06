import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Home page component - the main landing page of the WhatsApp OTP Sample App.
 *
 * @description This is the public entry point of the application. It displays different
 * content based on the user's authentication state using Clerk's SignedIn/SignedOut
 * components. Unauthenticated users see a sign-in prompt, while authenticated users
 * see their profile button and a link to the protected dashboard.
 *
 * The component serves as the first step in the authentication flow:
 * 1. User arrives at the home page
 * 2. User signs in via Clerk (SignInButton modal)
 * 3. After sign-in, user can navigate to /dashboard
 * 4. Middleware intercepts and redirects to /verify-whatsapp if 2FA is not completed
 *
 * @returns The home page JSX with conditional rendering based on auth state
 *
 * @see {@link VerifyWhatsAppPage} - WhatsApp OTP verification page (next step after sign-in)
 * @see {@link DashboardPage} - Protected dashboard (final destination after 2FA)
 * @see {@link RootLayout} - Parent layout providing ClerkProvider context
 *
 * @example
 * // This component is rendered at the root URL (/)
 * // It's automatically used by Next.js App Router from app/page.tsx
 */
export default function Home() {
  return (
    <main
      style={{
        maxWidth: 600,
        margin: '80px auto',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ marginBottom: 16 }}>WhatsApp OTP Sample App</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Demonstration of WhatsApp 2FA with Next.js, Clerk, and Meta Graph API
      </p>

      <SignedOut>
        <div
          style={{
            padding: 24,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ marginBottom: 16 }}>
            Sign in to access the protected dashboard
          </p>
          <SignInButton mode="modal">
            <button>Sign In</button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div
          style={{
            padding: 24,
            background: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <UserButton afterSignOutUrl="/" />
          </div>
          <p style={{ marginBottom: 16 }}>You are signed in!</p>
          <Link href="/dashboard">
            <button>Go to Dashboard</button>
          </Link>
        </div>
      </SignedIn>
    </main>
  );
}
