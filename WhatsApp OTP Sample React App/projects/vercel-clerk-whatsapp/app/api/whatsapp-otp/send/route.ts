import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';

/**
 * POST /api/whatsapp-otp/send
 *
 * Generates a new OTP code, sends it via WhatsApp, and returns a signed
 * challenge token to the client.
 *
 * @description This endpoint implements the first step of stateless OTP verification:
 * 1. Validates the user is authenticated via Clerk
 * 2. Generates a cryptographically secure OTP code
 * 3. Creates a signed JWT challenge token containing hashed userId, phone, and OTP
 * 4. Sends the OTP code to the user's WhatsApp number
 * 5. Returns the challenge token to be stored client-side
 *
 * The challenge token is safe to expose because:
 * - All data is hashed (userId, phone, OTP cannot be extracted)
 * - The token is signed (cannot be tampered with)
 * - It has a 5-minute expiration
 *
 * @requestBody
 * - phone: string - The WhatsApp phone number in E.164 format (e.g., "+14155551234")
 *
 * @returns
 * - 200: { success: true, challenge: string, message: string }
 * - 400: { error: string } - Missing phone number
 * - 401: { error: string } - User not authenticated
 * - 502: { error: string } - WhatsApp API error
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

  // Generate OTP and create signed challenge token
  const otpResult = await createOTP(userId, phone);
  if (!otpResult.success) {
    return NextResponse.json(
      { error: otpResult.error },
      { status: 500 }
    );
  }

  // Send via WhatsApp
  const sendResult = await sendWhatsAppOTP(phone, otpResult.code!);
  if (!sendResult.success) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  // Return the challenge token to the client
  // The client must store this and send it back during verification
  return NextResponse.json({
    success: true,
    challenge: otpResult.challenge,
    message: 'Verification code sent to your WhatsApp',
  });
}
