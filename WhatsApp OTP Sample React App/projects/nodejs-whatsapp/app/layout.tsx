/**
 * @fileoverview Root layout component for the Next.js application.
 *
 * This component wraps all pages and provides the base HTML structure,
 * global styles, and metadata for the application. It serves as the
 * entry point for the React component tree.
 *
 * @module app/layout
 * @see {@link app/page} - Login page rendered within this layout
 * @see {@link app/dashboard/page} - Dashboard page rendered within this layout
 */

import type { Metadata } from 'next';
import './globals.css';

/**
 * Application metadata for SEO and browser display.
 *
 * @constant
 * @type {Metadata}
 */
export const metadata: Metadata = {
  title: 'WhatsApp OTP Login',
  description: 'Sign in with your WhatsApp phone number',
};

/**
 * Props for the RootLayout component.
 *
 * @interface RootLayoutProps
 * @property {React.ReactNode} children - Child components to render within the layout
 */
interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root layout component that wraps all pages in the application.
 *
 * This component provides:
 * - HTML document structure with proper lang attribute
 * - Global CSS styles via globals.css import
 * - Antialiased font rendering for better text display
 *
 * @param {RootLayoutProps} props - Component props
 * @param {React.ReactNode} props.children - Child components (page content)
 * @returns {JSX.Element} The HTML document structure with children
 *
 * @example
 * ```tsx
 * // This layout is automatically applied by Next.js App Router
 * // Pages are rendered as children within the <body> element
 * ```
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
