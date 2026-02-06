import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

/**
 * Length of the OTP code (number of digits).
 * Defaults to 6 if not specified in environment variables.
 */
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);

/**
 * OTP expiry time in seconds.
 * Defaults to 300 seconds (5 minutes) for stateless verification.
 */
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10);

/**
 * Secret key for signing OTP challenge tokens.
 * Uses the same JWT_SECRET as session tokens.
 */
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Payload structure for the OTP challenge token.
 * This is a signed JWT that encodes the OTP verification parameters.
 *
 * @interface OTPChallengePayload
 * @property {string} phoneHash - SHA-256 hash of the normalized phone number
 * @property {string} otpHash - SHA-256 hash of the OTP code
 * @property {number} exp - Token expiration timestamp (Unix seconds)
 * @property {number} iat - Token issued-at timestamp (Unix seconds)
 */
export interface OTPChallengePayload {
  phoneHash: string;
  otpHash: string;
  exp: number;
  iat: number;
}

/**
 * Result returned when creating a new OTP.
 *
 * @interface CreateOTPResult
 * @property {string} code - The generated OTP code to send to the user
 * @property {string} challenge - Signed JWT challenge token containing hashed phone and OTP
 */
export interface CreateOTPResult {
  code: string;
  challenge: string;
}

/**
 * Result returned when verifying an OTP.
 *
 * @interface VerifyOTPResult
 * @property {boolean} success - Whether the verification was successful
 * @property {string} [error] - Error message if verification failed
 * @property {string} [phone] - The verified phone number (only on success)
 */
export interface VerifyOTPResult {
  success: boolean;
  error?: string;
  phone?: string;
}

/**
 * Generates a cryptographically secure random OTP code.
 *
 * @description
 * Uses crypto.randomBytes to generate secure random bytes, then maps
 * each byte to a digit (0-9) to create the OTP code.
 *
 * @returns {string} A random numeric string of OTP_LENGTH digits
 *
 * @example
 * const otp = generateOTP();
 * console.log(otp); // "847291"
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
 * Creates a SHA-256 hash of a string value.
 *
 * @description
 * Used to hash phone numbers and OTP codes before storing them in
 * the challenge token. This ensures the raw values are never exposed
 * in the token itself.
 *
 * @param {string} value - The string to hash
 * @returns {string} The hex-encoded SHA-256 hash of the input
 *
 * @example
 * const hash = hashValue("14155551234");
 * console.log(hash); // "a1b2c3d4..."
 */
function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Performs a constant-time comparison of two strings.
 *
 * @description
 * Uses crypto.timingSafeEqual to prevent timing attacks when comparing
 * OTP hashes. Both strings are padded to the same length before comparison
 * to ensure the comparison is truly constant-time.
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if the strings are equal, false otherwise
 *
 * @example
 * const isEqual = constantTimeEqual("abc123", "abc123"); // true
 * const notEqual = constantTimeEqual("abc123", "xyz789"); // false
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Ensure both buffers are the same length for timing-safe comparison
  if (bufA.length !== bufB.length) {
    // Create equal-length buffers to maintain constant-time behavior
    const maxLen = Math.max(bufA.length, bufB.length);
    const paddedA = Buffer.alloc(maxLen);
    const paddedB = Buffer.alloc(maxLen);
    bufA.copy(paddedA);
    bufB.copy(paddedB);
    return crypto.timingSafeEqual(paddedA, paddedB) && bufA.length === bufB.length;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Creates a new OTP and returns both the code and a signed challenge token.
 *
 * @description
 * This function implements stateless OTP creation. Instead of storing the OTP
 * in a database, it:
 * 1. Generates a random OTP code
 * 2. Creates a signed JWT (challenge token) containing hashed phone and OTP
 * 3. Returns both the code (to send via WhatsApp) and the challenge (to store client-side)
 *
 * The challenge token is self-contained and cannot be tampered with because it's
 * signed with a secret key. During verification, the client sends back both the
 * challenge and the OTP code they received.
 *
 * @param {string} phoneNumber - The normalized phone number (E.164 format without +)
 * @returns {Promise<CreateOTPResult>} Object containing the OTP code and signed challenge token
 *
 * @example
 * const { code, challenge } = await createOTP("14155551234");
 * // Send 'code' via WhatsApp
 * // Return 'challenge' to the client
 *
 * @security
 * - Phone number and OTP are hashed before being included in the token
 * - Token is signed with JWT_SECRET to prevent tampering
 * - Token has a 5-minute expiry to limit the attack window
 */
export async function createOTP(phoneNumber: string): Promise<CreateOTPResult> {
  const code = generateOTP();

  // Hash the phone number and OTP for storage in the token
  const phoneHash = hashValue(phoneNumber);
  const otpHash = hashValue(code);

  // Create a signed challenge token
  const challenge = await new SignJWT({
    phoneHash,
    otpHash,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_EXPIRY}s`)
    .sign(secret);

  return { code, challenge };
}

/**
 * Verifies an OTP code against a challenge token.
 *
 * @description
 * This function implements stateless OTP verification. It:
 * 1. Verifies the challenge token signature (ensures it wasn't tampered with)
 * 2. Checks that the token hasn't expired
 * 3. Hashes the provided phone number and OTP code
 * 4. Compares the hashes against those stored in the token using constant-time comparison
 *
 * @param {string} challenge - The signed challenge token returned from createOTP
 * @param {string} phoneNumber - The phone number being verified
 * @param {string} inputCode - The OTP code entered by the user
 * @returns {Promise<VerifyOTPResult>} Object with success status and optional error message
 *
 * @example
 * const result = await verifyOTP(challenge, "14155551234", "847291");
 * if (result.success) {
 *   console.log("Verified phone:", result.phone);
 * } else {
 *   console.log("Error:", result.error);
 * }
 *
 * @security
 * - Token signature is verified to prevent tampering
 * - Token expiry is checked to limit the verification window
 * - OTP comparison uses constant-time algorithm to prevent timing attacks
 * - Phone hash is verified to prevent using a challenge for a different phone
 */
export async function verifyOTP(
  challenge: string,
  phoneNumber: string,
  inputCode: string
): Promise<VerifyOTPResult> {
  try {
    // Verify the challenge token signature and check expiry
    const { payload } = await jwtVerify(challenge, secret);
    const challengePayload = payload as unknown as OTPChallengePayload;

    // Hash the provided phone number and code
    const phoneHash = hashValue(phoneNumber);
    const otpHash = hashValue(inputCode);

    // Verify phone number matches (constant-time comparison)
    if (!constantTimeEqual(phoneHash, challengePayload.phoneHash)) {
      return {
        success: false,
        error: 'Invalid verification request.',
      };
    }

    // Verify OTP code matches (constant-time comparison)
    if (!constantTimeEqual(otpHash, challengePayload.otpHash)) {
      return {
        success: false,
        error: 'Incorrect code. Please try again.',
      };
    }

    return {
      success: true,
      phone: phoneNumber,
    };
  } catch (error) {
    // Token verification failed (invalid signature, expired, etc.)
    if (error instanceof Error && error.message.includes('expired')) {
      return {
        success: false,
        error: 'Verification code has expired. Please request a new code.',
      };
    }

    return {
      success: false,
      error: 'Invalid verification request. Please request a new code.',
    };
  }
}
