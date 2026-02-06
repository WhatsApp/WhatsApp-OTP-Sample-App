/**
 * API route for sending WhatsApp OTP codes.
 *
 * @description This endpoint generates a new OTP and sends it to the user's
 * WhatsApp number. It is the first step in the WhatsApp 2FA verification flow.
 *
 * Endpoint: POST /api/whatsapp-otp/send
 *
 * Request body:
 * - `phone` (string, required): The WhatsApp phone number to send the OTP to
 *
 * Response codes:
 * - 200: OTP sent successfully
 * - 400: Missing phone number
 * - 401: User not authenticated with Clerk
 * - 429: Rate limited (too many requests or cooldown active)
 * - 502: WhatsApp API error
 *
 * @example
 * // Client-side usage
 * const response = await fetch('/api/whatsapp-otp/send', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ phone: '+14155551234' })
 * });
 * const data = await response.json();
 * // Success: { success: true, message: 'Verification code sent...' }
 * // Error: { error: 'Rate limited', retryAfterSeconds: 60 }
 *
 * @see {@link lib/otp.ts} - OTP generation and storage
 * @see {@link lib/whatsapp.ts} - WhatsApp message sending
 * @see {@link app/api/whatsapp-otp/verify/route.ts} - OTP verification endpoint
 *
 * @module app/api/whatsapp-otp/send
 */
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';

/**
 * Handles POST requests to send OTP via WhatsApp.
 *
 * @description Authenticates the user via Clerk, generates a secure OTP,
 * stores it in Redis with expiration, and sends it via WhatsApp Cloud API.
 *
 * @param request - The incoming HTTP request with phone number in body
 * @returns JSON response with success status or error details
 */
export async function POST(request: Request) {
  // User must be signed in with Clerk (first factor complete)
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { phone } = body;

  if (!phone) {
    return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
  }

  // Generate OTP
  const otpResult = await createOTP(userId, phone);
  if (!otpResult.success) {
    return NextResponse.json(
      { error: otpResult.error, retryAfterSeconds: otpResult.retryAfterSeconds },
      { status: 429 }
    );
  }

  // Send via WhatsApp
  const sendResult = await sendWhatsAppOTP(phone, otpResult.code!);
  if (!sendResult.success) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    message: 'Verification code sent to your WhatsApp',
  });
}
