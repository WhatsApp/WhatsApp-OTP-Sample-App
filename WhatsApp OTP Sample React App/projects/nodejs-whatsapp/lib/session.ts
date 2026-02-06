/**
 * @fileoverview JWT-based session management for authenticated users.
 *
 * This module handles user session lifecycle including JWT token creation,
 * verification, and cookie management. Sessions are stored as HTTP-only
 * cookies to prevent XSS attacks and include CSRF protection via SameSite.
 *
 * @module lib/session
 * @see {@link middleware} - Uses verifySession for route protection
 * @see {@link app/api/otp/verify/route} - Creates session after OTP verification
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/** Secret key for JWT signing, encoded as Uint8Array for jose library */
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/** Name of the session cookie */
const COOKIE_NAME = 'session';

/**
 * Shape of the JWT session payload.
 *
 * @interface SessionPayload
 * @property {string} phone - The authenticated user's phone number in E.164 format
 * @property {number} iat - Issued at timestamp (seconds since Unix epoch)
 * @property {number} exp - Expiration timestamp (seconds since Unix epoch)
 */
export interface SessionPayload {
  phone: string;
  iat: number;
  exp: number;
}

/**
 * Creates a new JWT session token for an authenticated user.
 *
 * The token is signed with HS256 algorithm and includes:
 * - Phone number as the primary identifier
 * - Issued at (iat) claim set automatically
 * - Expiration (exp) claim set to 7 days from creation
 *
 * @async
 * @param {string} phoneNumber - The authenticated user's phone number
 * @returns {Promise<string>} The signed JWT token
 *
 * @example
 * ```typescript
 * const token = await createSession('14155551234');
 * await setSessionCookie(token);
 * ```
 *
 * @requires JWT_SECRET - Environment variable containing the signing secret
 */
export async function createSession(phoneNumber: string): Promise<string> {
  const token = await new SignJWT({ phone: phoneNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

/**
 * Verifies a JWT session token and extracts its payload.
 *
 * Uses the jose library for JWT verification, which handles:
 * - Signature validation
 * - Expiration checking
 * - Algorithm verification
 *
 * @async
 * @param {string} token - The JWT token to verify
 * @returns {Promise<SessionPayload | null>} The decoded payload if valid, null otherwise
 *
 * @example
 * ```typescript
 * const payload = await verifySession(token);
 * if (payload) {
 *   console.log('Authenticated user:', payload.phone);
 * } else {
 *   console.log('Invalid or expired session');
 * }
 * ```
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Retrieves and verifies the current session from cookies.
 *
 * Convenience function that combines cookie reading with session verification.
 * Used in server components and API routes to check authentication status.
 *
 * @async
 * @returns {Promise<SessionPayload | null>} The session payload if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * // In a server component or API route
 * const session = await getSession();
 * if (!session) {
 *   redirect('/');
 * }
 * console.log('Phone:', session.phone);
 * ```
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Sets the session cookie with the provided JWT token.
 *
 * Cookie is configured with security best practices:
 * - httpOnly: true - Prevents JavaScript access (XSS protection)
 * - secure: true in production - Requires HTTPS
 * - sameSite: 'lax' - CSRF protection while allowing navigation
 * - maxAge: 7 days - Matches JWT expiration
 *
 * @async
 * @param {string} token - The JWT token to store in the cookie
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * const token = await createSession('14155551234');
 * await setSessionCookie(token);
 * // User is now logged in
 * ```
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clears the session cookie, effectively logging out the user.
 *
 * @async
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // In a server action
 * async function handleSignOut() {
 *   'use server';
 *   await clearSession();
 *   redirect('/');
 * }
 * ```
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
