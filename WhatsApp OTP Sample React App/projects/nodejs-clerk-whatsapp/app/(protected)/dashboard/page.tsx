import { currentUser } from '@clerk/nextjs/server';

/**
 * User metadata type definition for WhatsApp 2FA status.
 *
 * @description Represents the structure of public metadata stored in Clerk
 * after successful WhatsApp 2FA verification.
 */
interface WhatsApp2FAMetadata {
  /** The phone number that was verified via WhatsApp OTP */
  whatsapp_2fa_phone?: string;
  /** Flag indicating whether WhatsApp 2FA has been completed */
  whatsapp_2fa_enabled?: boolean;
}

/**
 * Dashboard page component displaying user information after successful 2FA.
 *
 * @description This is a protected server component that can only be accessed
 * after completing both Clerk authentication and WhatsApp 2FA verification.
 * The middleware enforces this protection by checking session claims.
 *
 * The dashboard displays:
 * - WhatsApp 2FA verification status with the verified phone number
 * - User details (name, email, user ID) from Clerk
 * - Information about the dual-layer protection
 *
 * As a server component, it fetches user data directly from Clerk's server SDK,
 * avoiding client-side data fetching and providing better security.
 *
 * @example
 * // Accessed after completing full authentication flow
 * // URL: /dashboard
 * // Requires: Clerk auth + WhatsApp 2FA verification
 *
 * @see {@link middleware.ts} - Enforces 2FA requirement for this route
 * @see {@link app/verify-whatsapp/page.tsx} - WhatsApp verification page
 * @see {@link app/(protected)/layout.tsx} - Protected layout wrapper
 *
 * @returns The dashboard page with user information and 2FA status
 */
export default async function DashboardPage() {
  const user = await currentUser();

  const metadata = user?.publicMetadata as WhatsApp2FAMetadata;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 24,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

      <div
        style={{
          padding: 16,
          background: '#e8f5e9',
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <p style={{ color: '#2e7d32', fontWeight: 500 }}>
          WhatsApp 2FA Verified
        </p>
        <p style={{ fontSize: 14, color: '#666' }}>
          Verified phone: {metadata?.whatsapp_2fa_phone || 'Unknown'}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>User Details</h2>
        <p>
          <strong>Name:</strong> {user?.firstName} {user?.lastName}
        </p>
        <p>
          <strong>Email:</strong> {user?.emailAddresses[0]?.emailAddress}
        </p>
        <p>
          <strong>User ID:</strong> {user?.id}
        </p>
      </div>

      <p style={{ color: '#666', fontSize: 14 }}>
        This page is protected by both Clerk authentication and WhatsApp 2FA.
        You can only see this content after completing both verification steps.
      </p>
    </div>
  );
}
