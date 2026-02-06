/**
 * @fileoverview API route for verifying OTP codes and creating sessions.
 *
 * This endpoint handles the second step of WhatsApp authentication by:
 * 1. Validating the phone number and OTP code
 * 2. Verifying the OTP against stored value in Redis
 * 3. Creating a JWT session and setting the session cookie
 *
 * @module app/api/otp/verify/route
 * @see {@link lib/otp} - OTP verification logic
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
 * 1. Extract and validate phone number and code from request body
 * 2. Normalize phone number to E.164 format (digits only)
 * 3. Verify OTP against Redis (with attempt limiting)
 * 4. On success: create JWT session and set HTTP-only cookie
 * 5. Client redirects to dashboard on success response
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
 *     code: '847293'
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
 * @throws {400} If phone number or code is missing, or invalid phone format
 * @throws {401} If OTP verification fails (wrong code, expired, too many attempts)
 * @throws {500} If internal error occurs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, code } = body;

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
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

    // Verify OTP
    const result = await verifyOTP(normalizedPhone, code);

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
