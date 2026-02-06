import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

/**
 * Server action to handle user sign out.
 *
 * @description
 * This is a Next.js Server Action that clears the user's session
 * and redirects them back to the login page. It is triggered when
 * the user clicks the "Sign out" button.
 *
 * The function:
 * 1. Clears the session cookie from the browser
 * 2. Redirects the user to the root route (/)
 *
 * @returns Never returns - always redirects to the login page
 */
async function handleSignOut() {
  'use server';
  await clearSession();
  redirect('/');
}

/**
 * DashboardPage - Protected page displaying authenticated user information.
 *
 * @description
 * This is an async Server Component that serves as the main protected area
 * of the application. It is only accessible to authenticated users who have
 * completed the WhatsApp OTP verification flow.
 *
 * The component performs the following:
 * 1. Retrieves the current session from the JWT cookie
 * 2. Redirects unauthenticated users to the login page
 * 3. Displays the authenticated user's phone number
 * 4. Provides a sign-out button to end the session
 *
 * Route protection is enforced at two levels:
 * - Middleware level: Redirects unauthenticated requests before reaching this page
 * - Component level: Double-checks session validity as a safety measure
 *
 * @example
 * // This component is rendered at /dashboard route
 * // Users are redirected here after successful OTP verification
 * // Access is protected by middleware.ts
 *
 * @see {@link LoginPage} - The authentication page users come from
 * @see {@link middleware} - Route protection middleware
 * @see {@link getSession} - Session retrieval function from lib/session.ts
 * @see {@link clearSession} - Session clearing function used by sign out
 *
 * @returns The dashboard UI with user info and sign out functionality
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
