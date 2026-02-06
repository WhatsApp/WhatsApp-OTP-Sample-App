import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import './globals.css';

/**
 * Application metadata for SEO and browser display.
 *
 * @description Defines the title and description shown in browser tabs,
 * search engine results, and social media previews.
 */
export const metadata: Metadata = {
  title: 'WhatsApp OTP Sample App',
  description: 'WhatsApp 2FA demonstration with Next.js and Clerk',
};

/**
 * Props interface for the root layout component.
 */
interface RootLayoutProps {
  /** Child components to render within the layout */
  children: React.ReactNode;
}

/**
 * Root layout component wrapping the entire application.
 *
 * @description This is the top-level layout that wraps all pages in the application.
 * It provides essential functionality:
 *
 * - **ClerkProvider**: Wraps the app to provide Clerk authentication context
 *   throughout the component tree. This enables hooks like `useUser`, `useAuth`,
 *   and components like `SignedIn`, `SignedOut`, `UserButton` to work.
 *
 * - **HTML Structure**: Sets up the base HTML document with language attribute
 *   and renders the body with child content.
 *
 * - **Global Styles**: Imports the global CSS file for base styling.
 *
 * As a server component, this layout is rendered on the server and provides
 * the authentication context needed for both server and client components.
 *
 * @example
 * // This layout automatically wraps all pages
 * // No explicit usage required - Next.js handles this
 *
 * @see {@link middleware.ts} - Authentication middleware using Clerk
 * @see {@link app/(protected)/layout.tsx} - Nested layout for protected routes
 *
 * @param props - The layout props containing children
 * @param props.children - Child components (pages and nested layouts)
 * @returns The root HTML document with Clerk provider
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
