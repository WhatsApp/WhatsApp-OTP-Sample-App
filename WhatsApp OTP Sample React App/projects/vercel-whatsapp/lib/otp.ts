import { redis } from './redis';
import crypto from 'crypto';

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10);

interface OTPData {
  code: string;
  attempts: number;
  createdAt: number;
}

function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

function getOTPKey(phoneNumber: string): string {
  return `otp:${phoneNumber}`;
}

function getRateLimitKey(phoneNumber: string): string {
  return `otp_rate:${phoneNumber}`;
}

export async function createOTP(phoneNumber: string): Promise<{ code: string } | { error: string }> {
  // Check rate limit (5 per hour)
  const rateLimitKey = getRateLimitKey(phoneNumber);
  const requestCount = await redis.incr(rateLimitKey);

  if (requestCount === 1) {
    await redis.expire(rateLimitKey, 3600); // 1 hour
  }

  if (requestCount > 5) {
    return { error: 'Too many OTP requests. Please try again later.' };
  }

  // Check cooldown (60 seconds between requests)
  const otpKey = getOTPKey(phoneNumber);
  const existingOTP = await redis.get<OTPData>(otpKey);

  if (existingOTP) {
    const timeSinceCreation = Date.now() - existingOTP.createdAt;
    if (timeSinceCreation < 60000) {
      const waitSeconds = Math.ceil((60000 - timeSinceCreation) / 1000);
      return { error: `Please wait ${waitSeconds} seconds before requesting a new code.` };
    }
  }

  // Generate and store OTP
  const code = generateOTP();
  const otpData: OTPData = {
    code,
    attempts: 0,
    createdAt: Date.now(),
  };

  await redis.set(otpKey, otpData, { ex: OTP_EXPIRY });

  return { code };
}

export async function verifyOTP(
  phoneNumber: string,
  inputCode: string
): Promise<{ success: boolean; error?: string }> {
  const otpKey = getOTPKey(phoneNumber);
  const otpData = await redis.get<OTPData>(otpKey);

  if (!otpData) {
    return { success: false, error: 'No OTP found. Please request a new code.' };
  }

  // Check max attempts
  if (otpData.attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(otpKey);
    return { success: false, error: 'Too many failed attempts. Please request a new code.' };
  }

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(inputCode.padEnd(OTP_LENGTH, '0')),
    Buffer.from(otpData.code.padEnd(OTP_LENGTH, '0'))
  );

  if (!isValid) {
    // Increment attempts
    otpData.attempts += 1;
    await redis.set(otpKey, otpData, { ex: OTP_EXPIRY });
    return {
      success: false,
      error: `Incorrect code. ${OTP_MAX_ATTEMPTS - otpData.attempts} attempts remaining.`,
    };
  }

  // Success - delete OTP
  await redis.del(otpKey);

  return { success: true };
}
