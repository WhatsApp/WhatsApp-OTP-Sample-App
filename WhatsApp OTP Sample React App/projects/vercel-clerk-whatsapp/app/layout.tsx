import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

/**
 * Application metadata configuration for Next.js.
 * Defines the page title and description used in the document head.
 */
export const metadata: Metadata = {
  title: 'WhatsApp OTP Sample App',
  description: 'WhatsApp 2FA demonstration with Next.js and Clerk',
};

/**
 * Props interface for the RootLayout component.
 */
interface RootLayoutProps {
  /**
   * Child components to be rendered within the layout.
   * This represents the page content that will be wrapped by the ClerkProvider.
   */
  children: React.ReactNode;
}

/**
 * Root layout component that wraps the entire application.
 *
 * @description This is the top-level layout component for the Next.js App Router.
 * It provides the HTML document structure and wraps all pages with the ClerkProvider
 * for authentication context. All child pages and layouts inherit Clerk's authentication
 * state through this provider.
 *
 * @param props - The component props
 * @param props.children - Child components (pages/layouts) to render within the layout
 *
 * @returns The root HTML structure with ClerkProvider wrapping all content
 *
 * @see {@link VerifyWhatsAppPage} - WhatsApp OTP verification page that uses Clerk context
 * @see {@link ProtectedLayout} - Nested layout for authenticated routes
 *
 * @example
 * // This component is automatically used by Next.js App Router.
 * // All pages in the app directory are wrapped by this layout.
 * // In app/page.tsx:
 * export default function Home() {
 *   return <div>Home content</div>; // Automatically wrapped by RootLayout
 * }
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
