import { currentUser } from '@clerk/nextjs/server';

/**
 * Type definition for user public metadata containing WhatsApp 2FA information.
 */
interface WhatsApp2FAMetadata {
  /**
   * The phone number verified via WhatsApp OTP.
   */
  whatsapp_2fa_phone?: string;

  /**
   * Whether WhatsApp 2FA has been successfully completed.
   * @default false
   */
  whatsapp_2fa_enabled?: boolean;
}

/**
 * Protected Dashboard Page Component.
 *
 * @description This is a server component that displays user information after
 * successful completion of both Clerk authentication and WhatsApp 2FA verification.
 * It serves as the final destination in the authentication flow and demonstrates
 * access to protected content.
 *
 * **Access Requirements:**
 * - User must be authenticated via Clerk
 * - User must have completed WhatsApp 2FA (whatsapp_2fa_enabled: true in publicMetadata)
 * - Middleware enforces these requirements before this page can be accessed
 *
 * **Displayed Information:**
 * - WhatsApp 2FA verification status and verified phone number
 * - User details from Clerk (name, email, user ID)
 * - Confirmation that both authentication layers are complete
 *
 * This component uses server-side data fetching with `currentUser()` to access
 * the authenticated user's information directly on the server.
 *
 * @returns Promise resolving to the dashboard UI with user information
 *
 * @see {@link ProtectedLayout} - Parent layout wrapping this page
 * @see {@link VerifyWhatsAppPage} - 2FA verification that precedes access to this page
 * @see {@link Home} - Entry point where authentication begins
 *
 * @example
 * // This component is rendered at /dashboard
 * // Users are redirected here after completing WhatsApp 2FA verification
 * // Access flow: Home -> Sign In -> Verify WhatsApp -> Dashboard
 */
export default async function DashboardPage() {
  const user = await currentUser();

  const metadata = user?.publicMetadata as WhatsApp2FAMetadata | undefined;

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
