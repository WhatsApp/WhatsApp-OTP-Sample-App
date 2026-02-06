'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyWhatsAppPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Pre-fill phone if user has one in Clerk
  useEffect(() => {
    if (isLoaded && user?.primaryPhoneNumber) {
      setPhone(user.primaryPhoneNumber.phoneNumber);
    }
  }, [isLoaded, user]);

  const requestOTP = async () => {
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

  const verifyOTP = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
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
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
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
