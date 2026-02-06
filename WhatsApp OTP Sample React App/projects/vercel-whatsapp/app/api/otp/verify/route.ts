import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';
import { createSession, setSessionCookie } from '@/lib/session';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

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
