import { NextRequest, NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * POST /api/otp/send
 *
 * Sends a one-time password (OTP) to the user's WhatsApp number.
 *
 * @description
 * This endpoint handles the first step of the stateless OTP authentication flow:
 * 1. Validates the phone number format using libphonenumber-js
 * 2. Normalizes the phone number to E.164 format (digits only)
 * 3. Generates a secure random OTP code and creates a signed challenge token
 * 4. Sends the OTP code to the user via WhatsApp Cloud API
 * 5. Returns the challenge token to the client (to be stored and passed back during verification)
 *
 * The challenge token is a signed JWT that contains hashed versions of the phone number
 * and OTP code. This enables stateless verification without needing a database.
 *
 * @param {NextRequest} request - The incoming request with JSON body containing phoneNumber
 * @returns {NextResponse} JSON response with challenge token on success, or error on failure
 *
 * @example
 * // Request
 * POST /api/otp/send
 * Content-Type: application/json
 * { "phoneNumber": "+1 415 555 1234" }
 *
 * // Success Response (200)
 * {
 *   "success": true,
 *   "message": "OTP sent successfully",
 *   "challenge": "eyJhbGciOiJIUzI1NiJ9..."
 * }
 *
 * // Error Response (400)
 * { "error": "Invalid phone number format" }
 *
 * // Error Response (500)
 * { "error": "Failed to send OTP" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Normalize phone number to E.164 format
    const parsed = parsePhoneNumber(phoneNumber);
    const normalizedPhone = parsed?.format('E.164').replace('+', '') || phoneNumber;

    // Create OTP and get the challenge token
    const { code, challenge } = await createOTP(normalizedPhone);

    // Send via WhatsApp
    const sendResult = await sendWhatsAppOTP(normalizedPhone, code);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    // Return the challenge token to the client
    // The client must store this and pass it back during verification
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      challenge,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
