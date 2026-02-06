/**
 * @fileoverview Redis client configuration for Upstash serverless Redis.
 *
 * This module initializes and exports a Redis client instance configured
 * for Upstash's REST-based Redis service. It serves as the foundation for
 * OTP storage, rate limiting, and other server-side data persistence needs.
 *
 * @module lib/redis
 * @see {@link lib/otp} - Uses this client for OTP storage and rate limiting
 */

import { Redis } from '@upstash/redis';

/**
 * Configured Upstash Redis client instance.
 *
 * This client uses Upstash's REST API, making it compatible with serverless
 * environments like Vercel Edge Functions and AWS Lambda where traditional
 * TCP connections are not ideal.
 *
 * @constant
 * @type {Redis}
 *
 * @example
 * ```typescript
 * import { redis } from '@/lib/redis';
 *
 * // Store a value with expiration
 * await redis.set('key', 'value', { ex: 3600 });
 *
 * // Retrieve a value
 * const value = await redis.get('key');
 *
 * // Delete a key
 * await redis.del('key');
 * ```
 *
 * @requires UPSTASH_REDIS_REST_URL - The Upstash Redis REST API URL
 * @requires UPSTASH_REDIS_REST_TOKEN - The Upstash Redis authentication token
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
