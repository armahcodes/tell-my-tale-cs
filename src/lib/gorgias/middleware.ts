/**
 * Gorgias Middleware Utilities
 * Shared auth verification and rate limiting for Gorgias-facing endpoints.
 */

import { NextRequest } from 'next/server';

/**
 * Verify the shared secret header on requests from Gorgias.
 * In dev mode (no secret configured), allows all requests.
 */
export function verifyWidgetSecret(request: NextRequest): boolean {
  const secret = process.env.GORGIAS_WIDGET_SECRET;
  if (!secret) return true;
  return request.headers.get('X-TellMyTale-Key') === secret;
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Create a sliding-window rate limiter.
 * Returns a check function that returns true if within limit.
 */
export function createRateLimiter(maxRequests: number, windowMs: number = 60_000) {
  const map = new Map<string, number[]>();

  return {
    check(ip: string): boolean {
      const now = Date.now();
      const timestamps = map.get(ip) || [];
      const valid = timestamps.filter((t) => now - t < windowMs);
      valid.push(now);
      map.set(ip, valid);

      // Periodic cleanup
      if (map.size > 1000) {
        for (const [key, ts] of map) {
          const active = ts.filter((t) => now - t < windowMs);
          if (active.length === 0) map.delete(key);
          else map.set(key, active);
        }
      }

      return valid.length <= maxRequests;
    },
  };
}
