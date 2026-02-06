/**
 * @fileoverview Protected dashboard page for authenticated users.
 *
 * This server component displays the main application content after
 * successful WhatsApp OTP authentication. It verifies the user's session
 * and provides sign-out functionality.
 *
 * @module app/dashboard/page
 * @see {@link lib/session} - Session management for authentication
 * @see {@link app/page} - Login page users are redirected to on sign-out
 * @see {@link middleware} - Route protection that guards this page
 */

import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Server action to handle user sign-out.
 *
 * Clears the session cookie and redirects the user to the login page.
 * This function is marked with 'use server' for Next.js server actions.
 *
 * @async
 * @returns {Promise<never>} Redirects to login, never returns
 */
async function handleSignOut() {
  'use server';
  await clearSession();
  redirect('/');
}

/**
 * Dashboard page component displaying user information after authentication.
 *
 * This is a server component that:
 * - Retrieves and validates the current session
 * - Redirects unauthenticated users to the login page
 * - Displays the authenticated user's phone number
 * - Provides a sign-out button using server actions
 *
 * @async
 * @returns {Promise<JSX.Element>} The dashboard page UI
 *
 * @example
 * ```tsx
 * // This page is automatically rendered by Next.js at /dashboard
 * // Users are redirected here after successful OTP verification
 * ```
 */
export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Welcome!
          </h2>
          <p className="text-gray-600">
            You are signed in with phone number:{' '}
            <span className="font-mono font-medium">+{session.phone}</span>
          </p>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-medium text-green-800">
              Authentication successful
            </h3>
            <p className="mt-1 text-sm text-green-700">
              You have been authenticated using WhatsApp OTP verification.
              This is a protected page that requires a valid session.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
