import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';

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
