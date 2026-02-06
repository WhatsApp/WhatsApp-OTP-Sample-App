/**
 * Stateless OTP (One-Time Password) generation and verification module.
 *
 * @description This module provides secure OTP functionality for WhatsApp 2FA
 * using signed JWT-like challenge tokens instead of server-side storage.
 *
 * Key features:
 * - Cryptographically secure OTP generation
 * - Stateless verification using signed challenge tokens
 * - No Redis or database dependency required
 * - Challenge tokens contain hashed user ID, phone, and OTP
 * - Automatic expiration (default: 5 minutes / 300 seconds)
 * - Constant-time comparison to prevent timing attacks
 *
 * Security considerations:
 * - Without server-side storage, we cannot limit verification attempts per OTP
 * - With 6 digits (1M combinations) and a 5-minute window, brute force is impractical
 * - Rate limiting can be added at the edge/CDN level if needed
 * - Challenge tokens are signed to prevent tampering
 *
 * @example
 * import { createOTP, verifyOTP } from './otp';
 *
 * // Generate OTP and challenge token
 * const result = await createOTP('user_123', '+14155551234');
 * if (result.success) {
 *   console.log('OTP code:', result.code);
 *   console.log('Challenge:', result.challenge);
 *   // Send result.code via WhatsApp
 *   // Return result.challenge to the client
 * }
 *
 * // Verify OTP using challenge token
 * const verification = await verifyOTP({
 *   challenge: 'eyJhbGciOiJIUzI1NiI...',
 *   code: '123456',
 *   userId: 'user_123'
 * });
 * if (verification.success) {
 *   console.log('OTP verified!');
 * }
 *
 * @see {@link lib/whatsapp.ts} - WhatsApp delivery after OTP creation
 * @see {@link app/api/whatsapp-otp/send/route.ts} - API using createOTP
 * @see {@link app/api/whatsapp-otp/verify/route.ts} - API using verifyOTP
 *
 * @module lib/otp
 */
import crypto from 'crypto';
import * as jose from 'jose';

/** OTP length in digits (configurable via OTP_LENGTH env var) */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');

/** Challenge token expiration time in seconds (default: 300 = 5 minutes) */
const CHALLENGE_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300');

/**
 * Secret key for signing challenge tokens.
 * Must be at least 32 characters for HS256 algorithm.
 *
 * @throws Will throw at runtime if OTP_SIGNING_SECRET is not set
 */
const getSigningSecret = (): Uint8Array => {
  const secret = process.env.OTP_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('OTP_SIGNING_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
};

/**
 * Payload structure for the signed challenge token.
 *
 * @description Contains hashed versions of sensitive data to enable
 * verification without storing anything server-side. Extends JWTPayload
 * to be compatible with jose library.
 */
interface OTPChallengePayload extends jose.JWTPayload {
  /** SHA-256 hash of the Clerk userId */
  userIdHash: string;
  /** SHA-256 hash of the phone number */
  phoneHash: string;
  /** SHA-256 hash of the OTP code */
  otpHash: string;
}

/**
 * Result type for OTP creation operation.
 *
 * @description Returned by createOTP function to indicate success or failure
 * with appropriate error information.
 */
export interface CreateOTPResult {
  /** Whether the OTP was successfully created */
  success: boolean;
  /** The generated OTP code (only present on success) */
  code?: string;
  /** The signed challenge token to send to the client (only present on success) */
  challenge?: string;
  /** Error message (only present on failure) */
  error?: string;
}

/**
 * Result type for OTP verification operation.
 *
 * @description Returned by verifyOTP function to indicate verification outcome.
 */
export interface VerifyOTPResult {
  /** Whether the OTP was successfully verified */
  success: boolean;
  /** Error message with details about the failure */
  error?: string;
}

/**
 * Input parameters for OTP verification.
 *
 * @description Contains all data needed to verify an OTP against a challenge token.
 */
export interface VerifyOTPInput {
  /** The signed challenge token received from createOTP */
  challenge: string;
  /** The OTP code entered by the user */
  code: string;
  /** The Clerk userId of the user attempting verification */
  userId: string;
}

/**
 * Computes a SHA-256 hash of the input string.
 *
 * @description Creates a deterministic hash for storing in challenge tokens.
 * Used to hash userId, phone number, and OTP code.
 *
 * @param input - The string to hash
 * @returns Hexadecimal representation of the SHA-256 hash
 *
 * @example
 * const hash = sha256('user_abc123'); // Returns 64-char hex string
 */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * @description Uses crypto.timingSafeEqual to ensure the comparison takes
 * the same amount of time regardless of where the strings differ.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * const isEqual = constantTimeCompare('abc', 'abc'); // true
 * const isNotEqual = constantTimeCompare('abc', 'xyz'); // false
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
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
 * Creates a new OTP and generates a signed challenge token.
 *
 * @description Generates a cryptographically secure OTP and creates a signed
 * JWT-like challenge token containing hashed versions of the userId, phone,
 * and OTP code. This enables stateless verification without any server-side storage.
 *
 * The challenge token:
 * - Is signed with HS256 using OTP_SIGNING_SECRET
 * - Contains hashed (not plaintext) values for security
 * - Has a configurable expiry (default: 5 minutes)
 * - Cannot be tampered with due to the signature
 *
 * @param userId - The Clerk user ID requesting the OTP
 * @param phone - The WhatsApp phone number to send the OTP to
 *
 * @returns A promise resolving to the creation result
 * @returns result.success - Whether the OTP was created successfully
 * @returns result.code - The generated OTP code (only on success)
 * @returns result.challenge - The signed challenge token (only on success)
 * @returns result.error - Error message describing the failure
 *
 * @throws Does not throw - errors are returned in the result object
 *
 * @example
 * const result = await createOTP('user_abc123', '+14155551234');
 * if (result.success) {
 *   await sendWhatsAppOTP('+14155551234', result.code!);
 *   // Return result.challenge to the client
 * }
 */
export async function createOTP(
  userId: string,
  phone: string
): Promise<CreateOTPResult> {
  try {
    const code = generateSecureOTP(OTP_LENGTH);

    // Create the challenge payload with hashed values
    const payload: OTPChallengePayload = {
      userIdHash: sha256(userId),
      phoneHash: sha256(phone),
      otpHash: sha256(code),
    };

    // Sign the challenge token
    const now = Math.floor(Date.now() / 1000);
    const challenge = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + CHALLENGE_EXPIRY_SECONDS)
      .sign(getSigningSecret());

    return {
      success: true,
      code,
      challenge,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create OTP',
    };
  }
}

/**
 * Verifies an OTP code against a signed challenge token.
 *
 * @description Validates the provided OTP code by:
 * 1. Verifying the challenge token signature
 * 2. Checking the token has not expired
 * 3. Verifying the userId matches the one used to create the challenge
 * 4. Comparing the OTP hash using constant-time comparison
 *
 * Security measures:
 * - Signature verification prevents token tampering
 * - Expiration check enforces time limit
 * - userId binding prevents token reuse across users
 * - Constant-time comparison prevents timing attacks
 *
 * Note: Without server-side storage, we cannot limit verification attempts.
 * However, with 6 digits (1M combinations) and a 5-minute window,
 * brute force is impractical. Rate limiting can be added at the edge/CDN level.
 *
 * @param input - Object containing challenge token, code, and userId
 * @param input.challenge - The signed challenge token from createOTP
 * @param input.code - The OTP code entered by the user
 * @param input.userId - The Clerk userId of the user verifying
 *
 * @returns A promise resolving to the verification result
 * @returns result.success - Whether the OTP was verified successfully
 * @returns result.error - Error message with details about the failure
 *
 * @throws Does not throw - errors are returned in the result object
 *
 * @example
 * const result = await verifyOTP({
 *   challenge: 'eyJhbGciOiJIUzI1NiI...',
 *   code: '847293',
 *   userId: 'user_abc123'
 * });
 * if (result.success) {
 *   // Update user metadata, grant access
 *   await clerkClient.users.updateUser(userId, {
 *     publicMetadata: { whatsapp_2fa_enabled: true }
 *   });
 * } else {
 *   console.error(result.error); // "Invalid or expired verification code"
 * }
 */
export async function verifyOTP(input: VerifyOTPInput): Promise<VerifyOTPResult> {
  const { challenge, code, userId } = input;

  if (!challenge || !code || !userId) {
    return {
      success: false,
      error: 'Missing required verification parameters',
    };
  }

  try {
    // Verify the signature and decode the payload
    const { payload } = await jose.jwtVerify(challenge, getSigningSecret());
    const { userIdHash, otpHash } = payload as OTPChallengePayload;

    // Verify the userId matches the one in the challenge
    const inputUserIdHash = sha256(userId);
    if (!constantTimeCompare(userIdHash, inputUserIdHash)) {
      return {
        success: false,
        error: 'Verification code was issued for a different user',
      };
    }

    // Verify the OTP code
    const inputOtpHash = sha256(code);
    if (!constantTimeCompare(otpHash, inputOtpHash)) {
      return {
        success: false,
        error: 'Incorrect verification code',
      };
    }

    return { success: true };
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jose.errors.JWTExpired) {
      return {
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      };
    }
    if (error instanceof jose.errors.JWSSignatureVerificationFailed) {
      return {
        success: false,
        error: 'Invalid verification token',
      };
    }

    return {
      success: false,
      error: 'Verification failed. Please request a new code.',
    };
  }
}
