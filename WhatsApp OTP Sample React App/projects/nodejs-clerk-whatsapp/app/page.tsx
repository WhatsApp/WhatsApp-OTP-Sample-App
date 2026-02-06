import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Home page component serving as the application landing page.
 *
 * @description This is the public entry point of the WhatsApp OTP Sample App.
 * It provides different UI based on the user's authentication state:
 *
 * - **Signed Out**: Displays a welcome message with a sign-in button that
 *   opens Clerk's modal authentication flow
 * - **Signed In**: Shows the user button for account management and a link
 *   to navigate to the protected dashboard
 *
 * This page does not require any authentication and serves as the starting
 * point for the 2FA demonstration flow.
 *
 * @example
 * // Accessed directly at the root URL
 * // URL: /
 *
 * @see {@link app/(auth)/sign-in/[[...sign-in]]/page.tsx} - Full-page sign-in alternative
 * @see {@link app/(protected)/dashboard/page.tsx} - Protected dashboard destination
 *
 * @returns The home page with conditional authentication UI
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
