import type { Metadata } from 'next';
import './globals.css';

/**
 * Metadata configuration for the WhatsApp OTP Login application.
 *
 * @description
 * Defines the page title and description that appear in browser tabs
 * and search engine results.
 */
export const metadata: Metadata = {
  title: 'WhatsApp OTP Login',
  description: 'Sign in with your WhatsApp phone number',
};

/**
 * Props interface for the RootLayout component.
 */
interface RootLayoutProps {
  /** The child components to render within the layout */
  children: React.ReactNode;
}

/**
 * RootLayout - The root layout component for the entire application.
 *
 * @description
 * This is the top-level layout that wraps all pages in the Next.js application.
 * It provides:
 * - The HTML document structure with proper language attribute
 * - Global CSS styles imported from globals.css
 * - Antialiased font rendering for improved text clarity
 *
 * This layout applies to all routes in the application, including:
 * - The login page (/)
 * - The protected dashboard (/dashboard)
 *
 * @example
 * // This component is automatically used by Next.js App Router
 * // All page components are rendered as children of this layout:
 * // <RootLayout>
 * //   <LoginPage /> or <DashboardPage />
 * // </RootLayout>
 *
 * @see {@link LoginPage} - The authentication page rendered at root
 * @see {@link DashboardPage} - The protected dashboard page
 *
 * @param props - The component props
 * @param props.children - The page content to render within the layout
 * @returns The root HTML document structure with the page content
 */
export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
