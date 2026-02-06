import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Props interface for the ProtectedLayout component.
 */
interface ProtectedLayoutProps {
  /**
   * Child components to be rendered within the protected layout.
   * These are pages that require both Clerk authentication and WhatsApp 2FA.
   */
  children: React.ReactNode;
}

/**
 * Layout component for protected routes requiring WhatsApp 2FA verification.
 *
 * @description This layout wraps all routes within the `(protected)` route group.
 * It provides a consistent header with navigation and user controls for authenticated
 * users who have completed WhatsApp 2FA verification.
 *
 * **Route Protection:**
 * Routes wrapped by this layout (e.g., /dashboard, /settings) are protected by:
 * 1. Clerk authentication (handled by middleware)
 * 2. WhatsApp 2FA verification (handled by middleware checking session claims)
 *
 * Users who haven't completed 2FA are redirected to /verify-whatsapp before
 * they can access any page using this layout.
 *
 * **Features:**
 * - Header with application branding and home link
 * - Clerk UserButton for account management and sign-out
 * - Consistent padding and styling for protected content
 *
 * @param props - The component props
 * @param props.children - Child pages to render within the layout
 *
 * @returns The protected layout with header and main content area
 *
 * @see {@link RootLayout} - Parent layout providing ClerkProvider
 * @see {@link VerifyWhatsAppPage} - 2FA verification gate for this layout
 * @see {@link DashboardPage} - Example page that uses this layout
 *
 * @example
 * // This layout is automatically applied to pages in app/(protected)/
 * // For example, app/(protected)/dashboard/page.tsx uses this layout:
 * export default function DashboardPage() {
 *   return <div>Dashboard content</div>; // Wrapped by ProtectedLayout
 * }
 */
export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          background: 'white',
          borderBottom: '1px solid #eee',
        }}
      >
        <Link href="/" style={{ fontWeight: 600, fontSize: 18 }}>
          WhatsApp OTP App
        </Link>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
