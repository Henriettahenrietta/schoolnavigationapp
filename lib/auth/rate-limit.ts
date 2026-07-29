// A tiny in-memory fixed-window rate limiter for login attempts. Sufficient for a
// single-instance app; swap for Redis if the app is ever horizontally scaled.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * @param key         identifier, e.g. `login:<ip>`
 * @param limit       max attempts per window
 * @param windowMs    window length in milliseconds
 */
export function rateLimit(key: string, limit = 5, windowMs = 60_000): RateResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Clear a key's attempts (call on a successful login). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}
