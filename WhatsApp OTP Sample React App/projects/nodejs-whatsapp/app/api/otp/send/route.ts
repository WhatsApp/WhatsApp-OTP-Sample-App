import { NextRequest, NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

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

    // Create OTP
    const result = await createOTP(normalizedPhone);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    // Send via WhatsApp
    const sendResult = await sendWhatsAppOTP(normalizedPhone, result.code);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
