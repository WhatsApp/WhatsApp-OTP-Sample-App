'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Represents the current step in the authentication flow.
 * - 'phone': User is entering their phone number
 * - 'otp': User is entering the verification code sent to their WhatsApp
 */
type Step = 'phone' | 'otp';

/**
 * LoginPage - Main authentication component for WhatsApp OTP login.
 *
 * @description
 * This is the primary authentication interface for the application. It manages
 * a two-step authentication flow:
 * 1. Phone number entry: User provides their WhatsApp phone number
 * 2. OTP verification: User enters the 6-digit code received via WhatsApp
 *
 * The component handles all state management for the auth flow including:
 * - Current step tracking (phone input vs OTP verification)
 * - Form values (phone number and OTP code)
 * - Loading states during API calls
 * - Error message display
 *
 * On successful verification, a JWT session is created server-side and the
 * user is redirected to the protected dashboard.
 *
 * @example
 * // This component is rendered at the root route '/'
 * // Usage in app router:
 * // app/page.tsx
 * export default function LoginPage() { ... }
 *
 * @see {@link DashboardPage} - The protected page users are redirected to after login
 * @see {@link /api/otp/send} - API route for sending OTP codes
 * @see {@link /api/otp/verify} - API route for verifying OTP codes
 *
 * @returns The login page UI with phone input or OTP verification form
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handles the phone number submission and sends an OTP to the user's WhatsApp.
   *
   * @description
   * This function is triggered when the user submits their phone number.
   * It makes a POST request to the /api/otp/send endpoint which:
   * 1. Validates the phone number format
   * 2. Generates a secure 6-digit OTP
   * 3. Stores the OTP in Redis with expiration
   * 4. Sends the OTP via WhatsApp using Meta's Cloud API
   *
   * On success, the user is moved to the OTP verification step.
   * On failure, an error message is displayed.
   *
   * @param e - The form submission event
   * @returns Promise that resolves when the API call completes
   */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles OTP verification and completes the authentication flow.
   *
   * @description
   * This function is triggered when the user submits the OTP code.
   * It makes a POST request to the /api/otp/verify endpoint which:
   * 1. Retrieves the stored OTP from Redis
   * 2. Compares the input code using timing-safe comparison
   * 3. Tracks verification attempts (max 3 allowed)
   * 4. On success, creates a JWT session and sets the session cookie
   *
   * On successful verification, the user is redirected to /dashboard.
   * On failure, an error message is displayed with remaining attempts.
   *
   * @param e - The form submission event
   * @returns Promise that resolves when verification completes
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Sign in with WhatsApp
          </h1>
          <p className="mt-2 text-gray-600">
            {step === 'phone'
              ? 'Enter your WhatsApp phone number to receive a verification code'
              : 'Enter the code sent to your WhatsApp'}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="space-y-6">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 234 567 8900"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Code via WhatsApp'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700"
              >
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-2xl tracking-widest"
                required
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
                setError('');
              }}
              className="w-full py-2 text-gray-600 hover:text-gray-800"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
