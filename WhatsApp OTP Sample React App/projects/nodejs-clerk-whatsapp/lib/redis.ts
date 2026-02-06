/**
 * Redis client configuration for OTP storage.
 *
 * @description This module exports a configured Upstash Redis client instance
 * used for storing and retrieving OTP codes. Upstash provides a serverless
 * Redis solution that works well with edge functions and serverless deployments.
 *
 * The client is configured using environment variables:
 * - `UPSTASH_REDIS_REST_URL`: The REST API endpoint for your Upstash Redis instance
 * - `UPSTASH_REDIS_REST_TOKEN`: The authentication token for API access
 *
 * @example
 * import { redis } from './redis';
 *
 * // Store a value with expiration
 * await redis.set('key', { data: 'value' }, { ex: 600 });
 *
 * // Retrieve a value
 * const data = await redis.get<{ data: string }>('key');
 *
 * // Delete a key
 * await redis.del('key');
 *
 * @see {@link lib/otp.ts} - OTP functions that use this Redis client
 * @see https://docs.upstash.com/redis - Upstash Redis documentation
 *
 * @module lib/redis
 */
import { Redis } from '@upstash/redis';

/**
 * Configured Upstash Redis client instance.
 *
 * @description Pre-configured Redis client using environment variables for
 * connection details. Used throughout the application for OTP storage,
 * rate limiting, and temporary data caching.
 *
 * @throws Will throw an error at runtime if environment variables are not set
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
