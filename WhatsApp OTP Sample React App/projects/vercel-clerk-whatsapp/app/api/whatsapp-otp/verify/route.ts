import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { code, phone } = body;

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  // Verify the OTP
  const result = await verifyOTP(userId, code);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // OTP verified! Update user metadata in Clerk to mark 2FA as complete.
  // We store the verified phone in publicMetadata so the middleware
  // can check it via session claims (no extra API calls needed).
  // We also store a session-specific verification timestamp in
  // privateMetadata for audit purposes.

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      whatsapp_2fa_phone: phone,
      whatsapp_2fa_enabled: true,
    },
    privateMetadata: {
      whatsapp_2fa_last_verified: new Date().toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
