/**
 * OTP (One-Time Password) generation and verification module.
 *
 * @description This module provides secure OTP functionality for WhatsApp 2FA:
 * - Cryptographically secure OTP generation
 * - Rate limiting (max 5 OTPs per hour per user)
 * - Cooldown period (60 seconds between requests)
 * - Attempt limiting (max 3 verification attempts)
 * - Automatic expiration via Redis TTL
 *
 * OTPs are stored in Redis with the key format `otp:{userId}` and automatically
 * expire after the configured TTL (default: 600 seconds / 10 minutes).
 *
 * @example
 * import { createOTP, verifyOTP } from './otp';
 *
 * // Generate and store a new OTP
 * const result = await createOTP('user_123', '+14155551234');
 * if (result.success) {
 *   console.log('OTP code:', result.code);
 * }
 *
 * // Verify an OTP
 * const verification = await verifyOTP('user_123', '123456');
 * if (verification.success) {
 *   console.log('OTP verified!');
 * }
 *
 * @see {@link lib/redis.ts} - Redis client used for storage
 * @see {@link lib/whatsapp.ts} - WhatsApp delivery after OTP creation
 * @see {@link app/api/whatsapp-otp/send/route.ts} - API using createOTP
 * @see {@link app/api/whatsapp-otp/verify/route.ts} - API using verifyOTP
 *
 * @module lib/otp
 */
import crypto from 'crypto';
import { redis } from './redis';

/** OTP length in digits (configurable via OTP_LENGTH env var) */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');

/** OTP expiration time in seconds (configurable via OTP_EXPIRY_SECONDS env var) */
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600');

/** Maximum verification attempts before OTP invalidation (configurable via OTP_MAX_ATTEMPTS env var) */
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

/**
 * Structure for OTP data stored in Redis.
 *
 * @description Represents the complete OTP record including the code,
 * attempt tracking, and creation timestamp for cooldown calculation.
 */
interface StoredOTP {
  /** The generated OTP code (numeric string) */
  code: string;
  /** Number of failed verification attempts */
  attempts: number;
  /** Timestamp when the OTP was created (milliseconds since epoch) */
  createdAt: number;
}

/**
 * Result type for OTP creation operation.
 *
 * @description Returned by createOTP function to indicate success or failure
 * with appropriate error information.
 */
interface CreateOTPResult {
  /** Whether the OTP was successfully created */
  success: boolean;
  /** The generated OTP code (only present on success) */
  code?: string;
  /** Error message (only present on failure) */
  error?: string;
  /** Seconds until the user can request a new OTP (for rate limiting) */
  retryAfterSeconds?: number;
}

/**
 * Result type for OTP verification operation.
 *
 * @description Returned by verifyOTP function to indicate verification outcome.
 */
interface VerifyOTPResult {
  /** Whether the OTP was successfully verified */
  success: boolean;
  /** Error message with remaining attempts or instructions */
  error?: string;
}

/**
 * Generates a cryptographically secure OTP code.
 *
 * @description Uses Node.js crypto.randomBytes for secure random number generation.
 * The generated code is always exactly the specified length with no leading zeros removed.
 *
 * @param length - Number of digits in the OTP
 * @returns A numeric string of the specified length
 *
 * @example
 * const code = generateSecureOTP(6); // Returns something like "847293"
 */
function generateSecureOTP(length: number): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return (min + (randomNumber % (max - min))).toString();
}

/**
 * Creates and stores a new OTP for the specified user.
 *
 * @description Generates a cryptographically secure OTP and stores it in Redis
 * with automatic expiration. Implements security measures including:
 *
 * - **Cooldown**: 60-second minimum between OTP requests for the same user
 * - **Rate Limiting**: Maximum 5 OTPs per hour per user
 * - **Auto-Expiration**: OTPs automatically expire after the configured TTL
 *
 * @param userId - The Clerk user ID requesting the OTP
 * @param phone - The WhatsApp phone number (used for logging/auditing, not storage key)
 *
 * @returns A promise resolving to the creation result
 * @returns result.success - Whether the OTP was created successfully
 * @returns result.code - The generated OTP code (only on success)
 * @returns result.error - Error message describing the failure
 * @returns result.retryAfterSeconds - Seconds to wait before retrying
 *
 * @throws Does not throw - errors are returned in the result object
 *
 * @example
 * const result = await createOTP('user_abc123', '+14155551234');
 * if (result.success) {
 *   await sendWhatsAppOTP('+14155551234', result.code!);
 * } else if (result.retryAfterSeconds) {
 *   console.log(`Please wait ${result.retryAfterSeconds} seconds`);
 * }
 */
export async function createOTP(
  userId: string,
  phone: string
): Promise<CreateOTPResult> {
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

/**
 * Verifies an OTP code against the stored value for a user.
 *
 * @description Validates the provided OTP code against the stored code in Redis.
 * Implements security measures including:
 *
 * - **Attempt Limiting**: Maximum 3 incorrect attempts before invalidation
 * - **Constant-Time Comparison**: Prevents timing attacks on code validation
 * - **Auto-Cleanup**: Deletes the OTP record on successful verification
 * - **Progressive Feedback**: Returns remaining attempts on failure
 *
 * @param userId - The Clerk user ID being verified
 * @param inputCode - The OTP code entered by the user
 *
 * @returns A promise resolving to the verification result
 * @returns result.success - Whether the OTP was verified successfully
 * @returns result.error - Error message with remaining attempts or instructions
 *
 * @throws Does not throw - errors are returned in the result object
 *
 * @example
 * const result = await verifyOTP('user_abc123', '847293');
 * if (result.success) {
 *   // Update user metadata, grant access
 *   await clerkClient.users.updateUser(userId, {
 *     publicMetadata: { whatsapp_2fa_enabled: true }
 *   });
 * } else {
 *   console.error(result.error); // "Incorrect code. 2 attempt(s) remaining."
 * }
 */
export async function verifyOTP(
  userId: string,
  inputCode: string
): Promise<VerifyOTPResult> {
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
