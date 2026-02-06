/**
 * @fileoverview API route for sending OTP codes via WhatsApp.
 *
 * This endpoint handles the first step of WhatsApp authentication by:
 * 1. Validating the phone number format
 * 2. Generating a secure OTP code and signed challenge token
 * 3. Sending the OTP via WhatsApp template message
 * 4. Returning the challenge token to the client for stateless verification
 *
 * @module app/api/otp/send/route
 * @see {@link lib/otp} - OTP generation with stateless challenge tokens
 * @see {@link lib/whatsapp} - WhatsApp API integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Handles POST requests to send an OTP code via WhatsApp.
 *
 * Request flow:
 * 1. Extract and validate phone number from request body
 * 2. Normalize phone number to E.164 format (digits only)
 * 3. Generate OTP and signed challenge token
 * 4. Send OTP via WhatsApp Cloud API
 * 5. Return challenge token to client for later verification
 *
 * The challenge token is a signed JWT containing hashed phone and OTP data.
 * The client must store this token and send it back during verification.
 *
 * @async
 * @param {NextRequest} request - The incoming request object
 * @returns {Promise<NextResponse>} JSON response with success status, challenge token, or error
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const response = await fetch('/api/otp/send', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ phoneNumber: '+14155551234' }),
 * });
 *
 * const data = await response.json();
 * if (data.success) {
 *   // Store challenge token for verification step
 *   setChallengeToken(data.challenge);
 * }
 * ```
 *
 * @throws {400} If phone number is missing or invalid format
 * @throws {500} If WhatsApp API fails or internal error occurs
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

    // Create OTP and challenge token
    const { code, challenge } = await createOTP(normalizedPhone);

    // Send via WhatsApp
    const sendResult = await sendWhatsAppOTP(normalizedPhone, code);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

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
