import crypto from 'crypto';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

/**
 * OTP code length (number of digits).
 * Configurable via OTP_LENGTH environment variable.
 * @default 6
 */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');

/**
 * OTP challenge expiry time in seconds.
 * The challenge token becomes invalid after this duration.
 * @default 300 (5 minutes)
 */
const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300');

/**
 * Secret key used to sign and verify challenge tokens.
 * Must be at least 32 characters for HS256 algorithm.
 * @throws Will use a development fallback if not set (not recommended for production)
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.OTP_JWT_SECRET || 'development-secret-change-in-production-32chars'
);

/**
 * Interface representing the JWT payload for an OTP challenge.
 * Contains hashed values to prevent data exposure while allowing verification.
 */
interface OTPChallengePayload extends JWTPayload {
  /** SHA-256 hash of the Clerk userId */
  userIdHash: string;
  /** SHA-256 hash of the phone number */
  phoneHash: string;
  /** SHA-256 hash of the OTP code */
  otpHash: string;
}

/**
 * Result type for OTP creation.
 */
interface CreateOTPResult {
  /** Whether OTP creation was successful */
  success: boolean;
  /** The generated OTP code (only on success) */
  code?: string;
  /** Signed challenge token to be stored client-side (only on success) */
  challenge?: string;
  /** Error message (only on failure) */
  error?: string;
}

/**
 * Result type for OTP verification.
 */
interface VerifyOTPResult {
  /** Whether OTP verification was successful */
  success: boolean;
  /** Error message (only on failure) */
  error?: string;
}

/**
 * Creates a SHA-256 hash of the input string.
 *
 * @param input - The string to hash
 * @returns Hexadecimal representation of the SHA-256 hash
 *
 * @example
 * const hash = sha256('user_123');
 * // Returns: '7b502c3a1f48c8609ae212cdfb639dee39673f5e...'
 */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generates a cryptographically secure random OTP code.
 *
 * @param length - Number of digits in the OTP
 * @returns A numeric string of the specified length (e.g., "123456")
 *
 * @description Uses crypto.randomBytes to generate a secure random number.
 * The result is always exactly `length` digits, with leading zeros if necessary.
 *
 * @example
 * const otp = generateSecureOTP(6);
 * // Returns: "847291" (random 6-digit code)
 */
function generateSecureOTP(length: number): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  return (min + (randomNumber % (max - min))).toString();
}

/**
 * Performs a constant-time comparison of two strings.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @description Uses crypto.timingSafeEqual to prevent timing attacks.
 * If strings have different lengths, returns false without timing leak.
 *
 * @example
 * const match = constantTimeCompare('abc123', 'abc123'); // true
 * const noMatch = constantTimeCompare('abc123', 'xyz789'); // false
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
 * Creates a stateless OTP challenge for WhatsApp verification.
 *
 * @param userId - The Clerk user ID requesting the OTP
 * @param phone - The WhatsApp phone number to verify
 * @returns Object containing the OTP code and signed challenge token
 *
 * @description This function implements a stateless OTP system by:
 * 1. Generating a cryptographically secure random OTP code
 * 2. Creating a signed JWT challenge containing hashed userId, phone, and OTP
 * 3. Setting an expiration time on the challenge token
 *
 * The challenge token is safe to store client-side because:
 * - All sensitive data is hashed (cannot be reversed)
 * - The token is signed (cannot be tampered with)
 * - It has an expiration time (limited validity window)
 *
 * @example
 * const result = await createOTP('user_abc123', '+14155551234');
 * if (result.success) {
 *   // Send result.code via WhatsApp
 *   // Return result.challenge to the client
 * }
 *
 * @see {@link verifyOTP} for verifying the challenge
 */
export async function createOTP(
  userId: string,
  phone: string
): Promise<CreateOTPResult> {
  const code = generateSecureOTP(OTP_LENGTH);

  // Create hashes of sensitive data
  const userIdHash = sha256(userId);
  const phoneHash = sha256(phone);
  const otpHash = sha256(code);

  const now = Math.floor(Date.now() / 1000);

  // Create and sign the challenge token
  const challenge = await new SignJWT({
    userIdHash,
    phoneHash,
    otpHash,
  } as OTPChallengePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + OTP_EXPIRY_SECONDS)
    .sign(JWT_SECRET);

  return { success: true, code, challenge };
}

/**
 * Verifies an OTP code against a signed challenge token.
 *
 * @param challenge - The signed challenge token from createOTP
 * @param inputCode - The OTP code entered by the user
 * @param userId - The Clerk user ID (must match the challenge)
 * @param phone - The phone number (must match the challenge)
 * @returns Object indicating success or failure with error message
 *
 * @description This function verifies the OTP by:
 * 1. Validating the JWT signature (ensures token wasn't tampered with)
 * 2. Checking the expiration time (ensures token is still valid)
 * 3. Comparing the hashed userId (ensures same user)
 * 4. Comparing the hashed phone (ensures same phone number)
 * 5. Comparing the hashed OTP code (validates the entered code)
 *
 * All comparisons use constant-time algorithms to prevent timing attacks.
 *
 * @example
 * const result = await verifyOTP(
 *   challengeToken,
 *   '123456',
 *   'user_abc123',
 *   '+14155551234'
 * );
 * if (result.success) {
 *   // OTP verified, proceed with 2FA completion
 * }
 *
 * @see {@link createOTP} for creating the challenge
 */
export async function verifyOTP(
  challenge: string,
  inputCode: string,
  userId: string,
  phone: string
): Promise<VerifyOTPResult> {
  try {
    // Verify signature and check expiration
    const { payload } = await jwtVerify(challenge, JWT_SECRET);
    const claims = payload as OTPChallengePayload;

    // Verify userId matches (constant-time comparison)
    const inputUserIdHash = sha256(userId);
    if (!constantTimeCompare(claims.userIdHash, inputUserIdHash)) {
      return {
        success: false,
        error: 'Invalid challenge token for this user.',
      };
    }

    // Verify phone matches (constant-time comparison)
    const inputPhoneHash = sha256(phone);
    if (!constantTimeCompare(claims.phoneHash, inputPhoneHash)) {
      return {
        success: false,
        error: 'Phone number does not match the challenge.',
      };
    }

    // Verify OTP code (constant-time comparison)
    const inputOtpHash = sha256(inputCode);
    if (!constantTimeCompare(claims.otpHash, inputOtpHash)) {
      return {
        success: false,
        error: 'Incorrect verification code. Please try again.',
      };
    }

    return { success: true };
  } catch (error) {
    // JWT verification failed (expired, invalid signature, malformed)
    if (error instanceof Error && error.message.includes('expired')) {
      return {
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      };
    }
    return {
      success: false,
      error: 'Invalid or expired challenge. Please request a new code.',
    };
  }
}
