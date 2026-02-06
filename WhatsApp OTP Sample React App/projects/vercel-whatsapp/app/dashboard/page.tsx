import { getSession, clearSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

async function handleSignOut() {
  'use server';
  await clearSession();
  redirect('/');
}

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
