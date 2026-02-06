/**
 * @fileoverview Login page with WhatsApp OTP authentication flow.
 *
 * This is the main entry point for user authentication. It implements a
 * two-step authentication flow:
 * 1. Phone input step: User enters their WhatsApp phone number
 * 2. OTP input step: User enters the verification code received via WhatsApp
 *
 * The authentication uses a stateless OTP system with signed challenge tokens.
 * The challenge token is returned after sending the OTP and must be passed back
 * during verification.
 *
 * @module app/page
 * @see {@link app/api/otp/send/route} - API endpoint for sending OTP (returns challenge)
 * @see {@link app/api/otp/verify/route} - API endpoint for verifying OTP (requires challenge)
 * @see {@link app/dashboard/page} - Destination after successful authentication
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Type representing the current step in the authentication flow.
 *
 * @typedef {'phone' | 'otp'} Step
 * @property {'phone'} phone - User is entering their phone number
 * @property {'otp'} otp - User is entering the verification code
 */
type Step = 'phone' | 'otp';

/**
 * Login page component implementing WhatsApp OTP authentication.
 *
 * This client component manages the complete authentication flow including:
 * - Phone number input with validation
 * - OTP code input with 6-digit restriction
 * - Challenge token storage for stateless verification
 * - Loading states during API calls
 * - Error message display
 * - Navigation between steps
 *
 * @returns {JSX.Element} The login page UI
 *
 * @example
 * ```tsx
 * // This page is automatically rendered by Next.js at the root route
 * // Access it by navigating to "/"
 * ```
 */
export default function LoginPage() {
  const router = useRouter();

  /**
   * Current authentication step.
   * @type {Step}
   */
  const [step, setStep] = useState<Step>('phone');

  /**
   * User's phone number input value.
   * @type {string}
   */
  const [phoneNumber, setPhoneNumber] = useState('');

  /**
   * OTP code input value.
   * @type {string}
   */
  const [otp, setOtp] = useState('');

  /**
   * Challenge token for stateless OTP verification.
   * Received from /api/otp/send and passed to /api/otp/verify.
   * @type {string}
   */
  const [challenge, setChallenge] = useState('');

  /**
   * Error message to display to the user.
   * @type {string}
   */
  const [error, setError] = useState('');

  /**
   * Loading state for API operations.
   * @type {boolean}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Handles the OTP send form submission.
   *
   * Sends a request to the /api/otp/send endpoint with the user's phone number.
   * On success, stores the challenge token and transitions to the OTP input step.
   *
   * @async
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
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

      // Store challenge token for verification step
      setChallenge(data.challenge);
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles the OTP verification form submission.
   *
   * Sends a request to the /api/otp/verify endpoint with the phone number,
   * code, and challenge token. On success, redirects the user to the dashboard page.
   *
   * @async
   * @param {React.FormEvent} e - The form submission event
   * @returns {Promise<void>}
   */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, code: otp, challenge }),
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
                setChallenge('');
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
