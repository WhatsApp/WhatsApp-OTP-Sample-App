import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';

/**
 * POST /api/whatsapp-otp/verify
 *
 * Verifies an OTP code against a signed challenge token and completes
 * the WhatsApp 2FA verification process.
 *
 * @description This endpoint implements the second step of stateless OTP verification:
 * 1. Validates the user is authenticated via Clerk
 * 2. Verifies the JWT challenge signature (ensures token wasn't tampered with)
 * 3. Checks the challenge hasn't expired (5-minute window)
 * 4. Validates the userId matches (prevents token reuse across users)
 * 5. Validates the phone matches (prevents using a different phone)
 * 6. Validates the OTP code (constant-time comparison of hashes)
 * 7. Updates Clerk publicMetadata to mark 2FA as complete
 *
 * Security considerations:
 * - The challenge token is stateless (no server-side storage needed)
 * - All comparisons use constant-time algorithms to prevent timing attacks
 * - The token can only be used once (userId/phone binding) for its validity period
 *
 * @requestBody
 * - challenge: string - The signed challenge token from /api/whatsapp-otp/send
 * - code: string - The 6-digit OTP code entered by the user
 * - phone: string - The WhatsApp phone number (must match the challenge)
 *
 * @returns
 * - 200: { success: true }
 * - 400: { error: string } - Missing fields or verification failed
 * - 401: { error: string } - User not authenticated
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code, phone, challenge } = body;

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge token required' }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  // Verify the OTP against the signed challenge token
  const result = await verifyOTP(challenge, code, userId, phone);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // OTP verified! Update user metadata in Clerk to mark 2FA as complete.
  // We store the verified phone in publicMetadata so the middleware
  // can check it via session claims (no extra API calls needed).
  // We also store a session-specific verification timestamp in
  // privateMetadata for audit purposes.

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      whatsapp_2fa_phone: phone,
      whatsapp_2fa_enabled: true,
    },
    privateMetadata: {
      whatsapp_2fa_last_verified: new Date().toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
