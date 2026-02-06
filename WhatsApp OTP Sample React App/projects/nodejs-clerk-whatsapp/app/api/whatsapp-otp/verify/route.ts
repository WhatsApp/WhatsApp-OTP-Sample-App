/**
 * API route for verifying WhatsApp OTP codes.
 *
 * @description This endpoint verifies the OTP code entered by the user against
 * the signed challenge token and, on successful verification, updates the user's
 * Clerk metadata to mark WhatsApp 2FA as complete. This is the final step in the 2FA flow.
 *
 * This implementation is stateless - verification is done by:
 * 1. Verifying the challenge token signature
 * 2. Checking the token has not expired
 * 3. Verifying the userId matches the authenticated user
 * 4. Comparing the OTP hash from the token with the hash of the entered code
 *
 * Endpoint: POST /api/whatsapp-otp/verify
 *
 * Request body:
 * - `code` (string, required): The 6-digit OTP code entered by the user
 * - `challenge` (string, required): The signed challenge token from the send endpoint
 * - `phone` (string, optional): The phone number for metadata storage
 *
 * Response codes:
 * - 200: OTP verified successfully, metadata updated
 * - 400: Missing code/challenge, incorrect code, expired token, or invalid token
 * - 401: User not authenticated with Clerk
 *
 * On success, this endpoint:
 * 1. Verifies the OTP against the challenge token
 * 2. Updates Clerk publicMetadata with `whatsapp_2fa_enabled: true`
 * 3. Stores verification timestamp in privateMetadata for auditing
 *
 * @example
 * // Client-side usage
 * const response = await fetch('/api/whatsapp-otp/verify', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     code: '847293',
 *     challenge: 'eyJhbGciOiJIUzI1NiI...',
 *     phone: '+14155551234'
 *   })
 * });
 * const data = await response.json();
 * // Success: { success: true }
 * // Error: { error: 'Incorrect verification code' }
 *
 * @see {@link lib/otp.ts} - Stateless OTP verification logic
 * @see {@link app/api/whatsapp-otp/send/route.ts} - OTP sending endpoint
 * @see {@link middleware.ts} - Uses the metadata set here for access control
 *
 * @module app/api/whatsapp-otp/verify
 */
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';

/**
 * Handles POST requests to verify OTP and complete 2FA.
 *
 * @description Validates the OTP code against the challenge token, and on success,
 * updates the user's Clerk metadata to enable access to protected routes.
 * The metadata update triggers a session refresh on the client side.
 *
 * @param request - The incoming HTTP request with code, challenge, and phone in body
 * @returns JSON response with success status or error details
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code, challenge, phone } = body;

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge token required' }, { status: 400 });
  }

  // Verify the OTP against the challenge token
  const result = await verifyOTP({ challenge, code, userId });
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
