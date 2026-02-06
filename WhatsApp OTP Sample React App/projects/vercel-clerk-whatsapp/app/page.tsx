import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

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
