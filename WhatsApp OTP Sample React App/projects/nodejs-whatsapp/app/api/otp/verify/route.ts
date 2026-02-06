/**
 * @fileoverview API route for verifying OTP codes and creating sessions.
 *
 * This endpoint handles the second step of WhatsApp authentication by:
 * 1. Validating the phone number, OTP code, and challenge token
 * 2. Verifying the OTP against the signed challenge token (stateless)
 * 3. Creating a JWT session and setting the session cookie
 *
 * @module app/api/otp/verify/route
 * @see {@link lib/otp} - Stateless OTP verification logic
 * @see {@link lib/session} - Session creation and cookie management
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';
import { createSession, setSessionCookie } from '@/lib/session';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Handles POST requests to verify an OTP code and authenticate the user.
 *
 * Verification flow:
 * 1. Extract and validate phone number, code, and challenge from request body
 * 2. Normalize phone number to E.164 format (digits only)
 * 3. Verify OTP against signed challenge token (stateless verification)
 * 4. On success: create JWT session and set HTTP-only cookie
 * 5. Client redirects to dashboard on success response
 *
 * The challenge token is a signed JWT returned from the /api/otp/send endpoint.
 * It contains hashed phone and OTP data, allowing stateless verification without
 * Redis or database storage.
 *
 * @async
 * @param {NextRequest} request - The incoming request object
 * @returns {Promise<NextResponse>} JSON response with success status or error
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/otp/verify', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     phoneNumber: '+14155551234',
 *     code: '847293',
 *     challenge: 'eyJhbGciOiJIUzI1NiJ9...'
 *   }),
 * });
 *
 * const data = await response.json();
 * if (data.success) {
 *   // Redirect to dashboard
 *   router.push('/dashboard');
 * }
 * ```
 *
 * @throws {400} If phone number, code, or challenge is missing, or invalid phone format
 * @throws {401} If OTP verification fails (wrong code, expired, invalid signature)
 * @throws {500} If internal error occurs
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

    // Verify OTP against challenge token (stateless)
    const result = await verifyOTP(normalizedPhone, code, challenge);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    // Create session using the verified phone number
    const token = await createSession(result.phone!);
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
