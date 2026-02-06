/**
 * @fileoverview OTP (One-Time Password) generation, storage, and verification logic.
 *
 * This module provides secure OTP management for WhatsApp-based authentication.
 * It handles OTP generation using cryptographically secure random bytes,
 * storage in Redis with automatic expiration, rate limiting to prevent abuse,
 * and constant-time verification to prevent timing attacks.
 *
 * @module lib/otp
 * @see {@link lib/redis} - Redis client used for OTP storage
 * @see {@link lib/whatsapp} - WhatsApp API for sending OTP messages
 */

import { redis } from './redis';
import crypto from 'crypto';

/** Length of the generated OTP code (default: 6 digits) */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);

/** OTP expiration time in seconds (default: 600 seconds / 10 minutes) */
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '600', 10);

/** Maximum verification attempts before OTP is invalidated (default: 3) */
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10);

/**
 * Shape of OTP data stored in Redis.
 *
 * @interface OTPData
 * @property {string} code - The generated OTP code
 * @property {number} attempts - Number of failed verification attempts
 * @property {number} createdAt - Unix timestamp when the OTP was created
 */
interface OTPData {
  code: string;
  attempts: number;
  createdAt: number;
}

/**
 * Generates a cryptographically secure numeric OTP.
 *
 * Uses Node.js crypto.randomBytes for secure random number generation,
 * ensuring unpredictable OTP codes that cannot be guessed or predicted.
 *
 * @returns {string} A numeric OTP of length OTP_LENGTH
 *
 * @example
 * ```typescript
 * const otp = generateOTP(); // Returns e.g., "847293"
 * ```
 */
function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

/**
 * Constructs the Redis key for storing OTP data for a phone number.
 *
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @returns {string} The Redis key in format "otp:{phoneNumber}"
 */
function getOTPKey(phoneNumber: string): string {
  return `otp:${phoneNumber}`;
}

/**
 * Constructs the Redis key for rate limiting OTP requests per phone number.
 *
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @returns {string} The Redis key in format "otp_rate:{phoneNumber}"
 */
function getRateLimitKey(phoneNumber: string): string {
  return `otp_rate:${phoneNumber}`;
}

/**
 * Creates and stores a new OTP for the given phone number.
 *
 * This function implements several security measures:
 * - Rate limiting: Maximum 5 OTP requests per phone number per hour
 * - Cooldown: Minimum 60 seconds between consecutive requests
 * - Secure generation: Uses cryptographically secure random bytes
 * - Auto-expiration: OTP automatically expires after OTP_EXPIRY seconds
 *
 * @async
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @returns {Promise<{ code: string } | { error: string }>} Object containing either:
 *   - `code`: The generated OTP code on success
 *   - `error`: Error message if rate limited or on cooldown
 *
 * @example
 * ```typescript
 * const result = await createOTP('14155551234');
 * if ('code' in result) {
 *   // Send OTP via WhatsApp
 *   await sendWhatsAppOTP('14155551234', result.code);
 * } else {
 *   // Handle rate limit or cooldown error
 *   console.error(result.error);
 * }
 * ```
 *
 * @throws {Error} If Redis operations fail
 */
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

/**
 * Verifies an OTP code entered by the user.
 *
 * This function implements security best practices:
 * - Constant-time comparison: Prevents timing attacks by using crypto.timingSafeEqual
 * - Attempt limiting: Invalidates OTP after OTP_MAX_ATTEMPTS failed attempts
 * - Automatic cleanup: Deletes OTP from Redis upon successful verification
 *
 * @async
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @param {string} inputCode - The OTP code entered by the user
 * @returns {Promise<{ success: boolean; error?: string }>} Verification result:
 *   - `success: true` if the code is valid
 *   - `success: false` with `error` message if verification fails
 *
 * @example
 * ```typescript
 * const result = await verifyOTP('14155551234', '123456');
 * if (result.success) {
 *   // Create session and redirect to dashboard
 *   const token = await createSession('14155551234');
 *   await setSessionCookie(token);
 * } else {
 *   // Show error to user
 *   console.error(result.error);
 * }
 * ```
 *
 * @throws {Error} If Redis operations fail
 */
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
