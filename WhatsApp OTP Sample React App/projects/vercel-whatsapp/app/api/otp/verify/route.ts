import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';
import { createSession, setSessionCookie } from '@/lib/session';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * POST /api/otp/verify
 *
 * Verifies an OTP code against a challenge token and creates a session on success.
 *
 * @description
 * This endpoint handles the second step of the stateless OTP authentication flow:
 * 1. Validates the phone number format
 * 2. Normalizes the phone number to E.164 format (digits only)
 * 3. Verifies the OTP code against the challenge token
 *    - Validates the token signature (ensures it wasn't tampered with)
 *    - Checks that the token hasn't expired
 *    - Compares the hashed phone number and OTP code
 * 4. On success, creates a JWT session and sets a session cookie
 *
 * The challenge token is a signed JWT that was returned by the /api/otp/send endpoint.
 * It contains hashed versions of the phone number and OTP code, enabling stateless
 * verification without needing a database.
 *
 * @param {NextRequest} request - The incoming request with JSON body containing:
 *   - phoneNumber: The user's phone number
 *   - code: The OTP code entered by the user
 *   - challenge: The challenge token from the send endpoint
 * @returns {NextResponse} JSON response with success status or error
 *
 * @example
 * // Request
 * POST /api/otp/verify
 * Content-Type: application/json
 * {
 *   "phoneNumber": "+1 415 555 1234",
 *   "code": "123456",
 *   "challenge": "eyJhbGciOiJIUzI1NiJ9..."
 * }
 *
 * // Success Response (200)
 * { "success": true, "message": "Verification successful" }
 *
 * // Error Response (400)
 * { "error": "Phone number, code, and challenge are required" }
 *
 * // Error Response (401)
 * { "error": "Incorrect code. Please try again." }
 * { "error": "Verification code has expired. Please request a new code." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, code, challenge } = body;

    if (!phoneNumber || !code || !challenge) {
      return NextResponse.json(
        { error: 'Phone number, code, and challenge are required' },
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

    // Normalize phone number
    const parsed = parsePhoneNumber(phoneNumber);
    const normalizedPhone = parsed?.format('E.164').replace('+', '') || phoneNumber;

    // Verify OTP against the challenge token
    const result = await verifyOTP(challenge, normalizedPhone, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Create session
    const token = await createSession(normalizedPhone);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
