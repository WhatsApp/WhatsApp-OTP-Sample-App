import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';

/**
 * Props interface for the protected layout component.
 */
interface ProtectedLayoutProps {
  /** Child components to render within the protected area */
  children: React.ReactNode;
}

/**
 * Layout component for protected routes requiring full authentication.
 *
 * @description This layout wraps all routes within the `(protected)` route group,
 * which includes pages that require both Clerk authentication and WhatsApp 2FA
 * verification. The middleware enforces access control before this layout renders.
 *
 * The layout provides:
 * - **Header**: A consistent navigation header with:
 *   - App branding/name linking back to home
 *   - Clerk UserButton for account management and sign-out
 * - **Main Content Area**: Padded container for page content
 *
 * This is a Next.js route group layout, meaning it applies to all pages under
 * the `(protected)` directory (e.g., `/dashboard`, `/settings`) without adding
 * to the URL path.
 *
 * @example
 * // Automatically wraps pages in app/(protected)/
 * // URL: /dashboard renders with this layout
 *
 * @see {@link app/(protected)/dashboard/page.tsx} - Dashboard page using this layout
 * @see {@link middleware.ts} - Enforces 2FA for routes under this layout
 * @see {@link app/layout.tsx} - Parent root layout
 *
 * @param props - The layout props
 * @param props.children - Child page components
 * @returns The protected layout with header and content area
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
