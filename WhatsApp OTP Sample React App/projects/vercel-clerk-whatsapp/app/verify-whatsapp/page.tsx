'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Type definition for the verification step state.
 * - 'phone': User is entering their WhatsApp phone number
 * - 'verify': User is entering the OTP code received via WhatsApp
 */
type VerificationStep = 'phone' | 'verify';

/**
 * WhatsApp OTP Verification Page Component.
 *
 * @description This is the main container component that manages the entire WhatsApp OTP
 * verification flow. It serves as the second factor authentication (2FA) gate between
 * Clerk authentication and access to protected routes.
 *
 * The component implements a two-step verification process:
 * 1. **Phone Step**: User enters their WhatsApp phone number
 * 2. **Verify Step**: User enters the 6-digit OTP code received via WhatsApp
 *
 * **Authentication Flow Integration:**
 * - Users are redirected here by middleware when accessing protected routes without 2FA
 * - The page calls `/api/whatsapp-otp/send` to generate OTP and receive a signed challenge token
 * - The challenge token is stored in component state (stateless verification)
 * - The page calls `/api/whatsapp-otp/verify` with the challenge token to validate the entered code
 * - On successful verification, Clerk's publicMetadata is updated with `whatsapp_2fa_enabled: true`
 * - The Clerk session is refreshed to include the new claim
 * - User is redirected to the original destination (or /dashboard by default)
 *
 * **Stateless OTP Architecture:**
 * - No server-side storage (Redis) is required
 * - The challenge token is a signed JWT containing hashed userId, phone, and OTP
 * - The token expires after 5 minutes
 * - All verification happens by comparing hashes against the signed token
 *
 * **Features:**
 * - Pre-fills phone number from Clerk user profile if available
 * - 60-second countdown timer before allowing resend
 * - Error handling for network and validation errors
 * - Loading states during API calls
 *
 * @returns The WhatsApp verification UI with phone input or OTP input based on current step
 *
 * @see {@link Home} - Entry point that leads to sign-in
 * @see {@link DashboardPage} - Destination after successful verification
 * @see {@link ProtectedLayout} - Layout wrapper for protected routes
 *
 * @example
 * // This component is rendered at /verify-whatsapp
 * // Users are typically redirected here by middleware:
 * // middleware.ts redirects to /verify-whatsapp?redirect_url=/dashboard
 */
export default function VerifyWhatsAppPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

  const [step, setStep] = useState<VerificationStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  /**
   * Signed challenge token from the server.
   * This JWT contains hashed userId, phone, and OTP for stateless verification.
   * Must be sent back to the server during OTP verification.
   */
  const [challenge, setChallenge] = useState('');

  /**
   * Effect to pre-fill the phone number from Clerk user profile.
   * If the user has a primary phone number stored in Clerk, it will be
   * automatically populated in the phone input field.
   */
  useEffect(() => {
    if (isLoaded && user?.primaryPhoneNumber) {
      setPhone(user.primaryPhoneNumber.phoneNumber);
    }
  }, [isLoaded, user]);

  /**
   * Requests an OTP to be sent to the user's WhatsApp number.
   *
   * @description This function calls the `/api/whatsapp-otp/send` endpoint which:
   * 1. Generates a 6-digit OTP code
   * 2. Creates a signed JWT challenge token
   * 3. Sends the OTP via WhatsApp using Meta Graph API
   * 4. Returns the challenge token to be stored client-side
   *
   * On success, stores the challenge token, transitions to the 'verify' step,
   * and starts a 60-second countdown before allowing the user to request a new code.
   *
   * @returns Promise that resolves when the API call completes
   */
  const requestOTP = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (data.success) {
        // Store the challenge token for verification
        setChallenge(data.challenge);
        setStep('verify');
        setCountdown(60);
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  /**
   * Verifies the OTP code entered by the user.
   *
   * @description This function calls the `/api/whatsapp-otp/verify` endpoint which:
   * 1. Validates the signed challenge token (signature + expiry)
   * 2. Verifies the OTP code matches the hash in the token
   * 3. Confirms the userId and phone match the token
   * 4. Updates Clerk's publicMetadata with whatsapp_2fa_enabled: true
   *
   * On success:
   * - Reloads the Clerk user to refresh session claims
   * - Redirects to the original destination URL
   *
   * @returns Promise that resolves when verification completes
   */
  const verifyOTP = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, challenge }),
      });
      const data = await res.json();

      if (data.success) {
        // Force Clerk to refresh the session with updated metadata.
        // This ensures middleware sees the new whatsapp_2fa_enabled claim.
        await user?.reload();
        router.push(redirectUrl);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  /**
   * Handles the "Resend Code" action.
   * Resets the verification state to allow requesting a new OTP.
   * Clears the previous challenge token and entered code.
   */
  const handleResendCode = (): void => {
    setStep('phone');
    setCode('');
    setChallenge('');
  };

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80 }}>Loading...</div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '80px auto',
        padding: 24,
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ marginBottom: 8 }}>WhatsApp Verification</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        For your security, please verify your identity via WhatsApp.
      </p>

      {step === 'phone' && (
        <>
          <label htmlFor="phone">WhatsApp phone number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+14155551234"
            style={{ width: '100%', marginTop: 4, marginBottom: 16 }}
          />
          <button
            onClick={requestOTP}
            disabled={loading || !phone}
            style={{ width: '100%' }}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </>
      )}

      {step === 'verify' && (
        <>
          <p style={{ marginBottom: 12 }}>
            Code sent to <strong>{phone}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            style={{
              width: '100%',
              padding: 12,
              fontSize: 24,
              letterSpacing: 8,
              textAlign: 'center',
              marginBottom: 16,
            }}
          />
          <button
            onClick={verifyOTP}
            disabled={loading || code.length < 6}
            style={{ width: '100%' }}
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <p style={{ marginTop: 12, fontSize: 14, textAlign: 'center' }}>
            {countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              <button
                onClick={handleResendCode}
                style={{
                  background: 'none',
                  color: '#0070f3',
                  padding: 0,
                  fontSize: 14,
                }}
              >
                Resend Code
              </button>
            )}
          </p>
        </>
      )}

      {error && (
        <p style={{ color: 'red', marginTop: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  );
}
