/**
 * @fileoverview Stateless OTP (One-Time Password) generation and verification.
 *
 * This module provides a stateless OTP system using signed challenge tokens.
 * Instead of storing OTP data in Redis, the OTP is hashed and included in a
 * signed JWT-like token that is returned to the client. The client must
 * present this token along with the OTP code for verification.
 *
 * Benefits of stateless OTP:
 * - No Redis or database dependency required
 * - Horizontally scalable without shared state
 * - Simpler infrastructure requirements
 *
 * Trade-offs:
 * - Cannot limit verification attempts (mitigated by short expiry and 6-digit entropy)
 * - Client must store and return the challenge token
 *
 * @module lib/otp
 * @see {@link lib/whatsapp} - WhatsApp API for sending OTP messages
 * @see {@link lib/session} - Uses jose library for JWT operations
 */

import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

/** Length of the generated OTP code (default: 6 digits) */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);

/** OTP challenge expiration time in seconds (default: 300 seconds / 5 minutes) */
const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);

/** Secret key for signing challenge tokens, encoded as Uint8Array for jose library */
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Shape of the OTP challenge token payload.
 *
 * The challenge token is a signed JWT containing hashed phone and OTP data.
 * This allows verification without server-side state storage.
 *
 * @interface OTPChallenge
 * @property {string} phoneHash - SHA-256 hash of the phone number
 * @property {string} otpHash - SHA-256 hash of the OTP code
 * @property {number} exp - Expiration timestamp (seconds since Unix epoch)
 * @property {number} iat - Issued at timestamp (seconds since Unix epoch)
 */
export interface OTPChallenge {
  phoneHash: string;
  otpHash: string;
  exp: number;
  iat: number;
}

/**
 * Result of creating an OTP.
 *
 * @interface CreateOTPResult
 * @property {string} code - The generated OTP code to send to the user
 * @property {string} challenge - The signed challenge token to return to the client
 */
export interface CreateOTPResult {
  code: string;
  challenge: string;
}

/**
 * Result of verifying an OTP.
 *
 * @interface VerifyOTPResult
 * @property {boolean} success - Whether verification was successful
 * @property {string} [phone] - The verified phone number (only on success)
 * @property {string} [error] - Error message (only on failure)
 */
export interface VerifyOTPResult {
  success: boolean;
  phone?: string;
  error?: string;
}

/**
 * Computes a SHA-256 hash of the input string.
 *
 * Used to hash phone numbers and OTP codes before storing in the challenge token.
 * This ensures the actual values are not exposed in the token payload.
 *
 * @param {string} input - The string to hash
 * @returns {string} The SHA-256 hash as a hexadecimal string
 *
 * @example
 * ```typescript
 * const phoneHash = hash('14155551234'); // Returns 64-char hex string
 * ```
 */
function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
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
 * Performs constant-time comparison of two strings.
 *
 * Uses crypto.timingSafeEqual to prevent timing attacks during OTP verification.
 * Pads shorter strings to ensure equal length comparison.
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * const isEqual = constantTimeEqual('abc123', 'abc123'); // true
 * const isNotEqual = constantTimeEqual('abc123', 'xyz789'); // false
 * ```
 */
function constantTimeEqual(a: string, b: string): boolean {
  const maxLength = Math.max(a.length, b.length);
  const bufferA = Buffer.from(a.padEnd(maxLength, '\0'));
  const bufferB = Buffer.from(b.padEnd(maxLength, '\0'));
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Creates a new OTP and generates a signed challenge token.
 *
 * This function generates a secure OTP code and creates a signed JWT-like
 * challenge token containing hashed phone and OTP data. The token is used
 * for stateless verification - no server-side storage is required.
 *
 * @async
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @returns {Promise<CreateOTPResult>} Object containing:
 *   - `code`: The generated OTP code to send via WhatsApp
 *   - `challenge`: The signed challenge token to return to the client
 *
 * @example
 * ```typescript
 * const result = await createOTP('14155551234');
 * // Send OTP via WhatsApp
 * await sendWhatsAppOTP('14155551234', result.code);
 * // Return challenge to client
 * return { success: true, challenge: result.challenge };
 * ```
 *
 * @throws {Error} If JWT signing fails
 */
export async function createOTP(phoneNumber: string): Promise<CreateOTPResult> {
  const code = generateOTP();

  // Create hashes of phone and OTP for the challenge token
  const phoneHash = hash(phoneNumber);
  const otpHash = hash(code);

  // Sign the challenge token with expiry
  const challenge = await new SignJWT({ phoneHash, otpHash })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_EXPIRY_SECONDS}s`)
    .sign(secret);

  return { code, challenge };
}

/**
 * Verifies an OTP code against a challenge token.
 *
 * This function performs stateless verification by:
 * 1. Verifying the JWT signature and checking expiration
 * 2. Hashing the provided phone number and comparing to stored hash
 * 3. Hashing the provided OTP code and comparing to stored hash
 *
 * All comparisons use constant-time algorithms to prevent timing attacks.
 *
 * @async
 * @param {string} phoneNumber - The phone number in E.164 format (without +)
 * @param {string} inputCode - The OTP code entered by the user
 * @param {string} challenge - The challenge token returned from createOTP
 * @returns {Promise<VerifyOTPResult>} Verification result:
 *   - `success: true` with `phone` if the code is valid
 *   - `success: false` with `error` message if verification fails
 *
 * @example
 * ```typescript
 * const result = await verifyOTP('14155551234', '123456', challengeToken);
 * if (result.success) {
 *   // Create session and redirect to dashboard
 *   const token = await createSession(result.phone);
 *   await setSessionCookie(token);
 * } else {
 *   // Show error to user
 *   console.error(result.error);
 * }
 * ```
 */
export async function verifyOTP(
  phoneNumber: string,
  inputCode: string,
  challenge: string
): Promise<VerifyOTPResult> {
  try {
    // Verify JWT signature and check expiration
    const { payload } = await jwtVerify(challenge, secret);

    const challengePayload = payload as unknown as OTPChallenge;

    // Verify phone number matches (constant-time comparison)
    const inputPhoneHash = hash(phoneNumber);
    if (!constantTimeEqual(inputPhoneHash, challengePayload.phoneHash)) {
      return { success: false, error: 'Phone number mismatch.' };
    }

    // Verify OTP code matches (constant-time comparison)
    const inputOtpHash = hash(inputCode);
    if (!constantTimeEqual(inputOtpHash, challengePayload.otpHash)) {
      return { success: false, error: 'Incorrect verification code.' };
    }

    // Success - return the verified phone number
    return { success: true, phone: phoneNumber };
  } catch (error) {
    // JWT verification failed (expired, invalid signature, malformed)
    if (error instanceof Error && error.message.includes('exp')) {
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
    return { success: false, error: 'Invalid or expired verification code. Please request a new code.' };
  }
}
