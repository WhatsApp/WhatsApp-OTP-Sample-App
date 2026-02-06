import crypto from 'crypto';
import { redis } from './redis';

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600');
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

interface StoredOTP {
  code: string;
  attempts: number;
  createdAt: number;
}

function generateSecureOTP(length: number): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return (min + (randomNumber % (max - min))).toString();
}

export async function createOTP(
  userId: string,
  phone: string
): Promise<{
  success: boolean;
  code?: string;
  error?: string;
  retryAfterSeconds?: number;
}> {
  const key = `otp:${userId}`;

  // Check if an OTP was recently sent (cooldown)
  const existing = await redis.get<StoredOTP>(key);
  if (existing) {
    const elapsed = (Date.now() - existing.createdAt) / 1000;
    if (elapsed < 60) {
      return {
        success: false,
        error: 'Please wait before requesting a new code',
        retryAfterSeconds: Math.ceil(60 - elapsed),
      };
    }
  }

  // Check rate limit (max 5 OTPs per hour per user)
  const rateLimitKey = `otp-rate:${userId}`;
  const count = await redis.incr(rateLimitKey);
  if (count === 1) {
    await redis.expire(rateLimitKey, 3600);
  }
  if (count > 5) {
    return {
      success: false,
      error: 'Too many OTP requests. Try again later.',
      retryAfterSeconds: 3600,
    };
  }

  const code = generateSecureOTP(OTP_LENGTH);

  const record: StoredOTP = {
    code,
    attempts: 0,
    createdAt: Date.now(),
  };

  // Store with TTL (auto-expires in Redis)
  await redis.set(key, record, { ex: OTP_EXPIRY });

  return { success: true, code };
}

export async function verifyOTP(
  userId: string,
  inputCode: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const key = `otp:${userId}`;
  const record = await redis.get<StoredOTP>(key);

  if (!record) {
    return {
      success: false,
      error: 'No verification code found. Please request a new one.',
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(key);
    return {
      success: false,
      error: 'Too many incorrect attempts. Request a new code.',
    };
  }

  // Constant-time comparison
  const isValid =
    inputCode === record.code && inputCode.length === record.code.length;

  if (!isValid) {
    record.attempts += 1;
    await redis.set(key, record, { keepttl: true });
    const remaining = MAX_ATTEMPTS - record.attempts;
    return {
      success: false,
      error: `Incorrect code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Success — clean up
  await redis.del(key);
  return { success: true };
}
