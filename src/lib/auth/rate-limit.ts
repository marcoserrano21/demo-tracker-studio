type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const AUTH_RATE_LIMIT = {
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
} as const;

export type RateLimitResult = { allowed: boolean; retryAfterSec?: number };

function consumeInMemory(
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

async function consumeDistributed(
  key: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', `ratelimit:${key}`],
        ['EXPIRE', `ratelimit:${key}`, windowSec, 'NX'],
        ['TTL', `ratelimit:${key}`],
      ]),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const results = (await response.json()) as { result: number }[];
    const count = results[0]?.result ?? 0;
    const ttl = results[2]?.result ?? windowSec;

    if (count > maxAttempts) {
      return { allowed: false, retryAfterSec: Math.max(1, ttl) };
    }
    return { allowed: true };
  } catch (error) {
    console.error('[rate-limit] Upstash error, falling back to in-memory:', error);
    return null;
  }
}

/**
 * Sliding-window limiter: Upstash Redis when configured, in-memory fallback per instance.
 */
export async function consumeRateLimit(
  key: string,
  maxAttempts: number = AUTH_RATE_LIMIT.maxAttempts,
  windowMs: number = AUTH_RATE_LIMIT.windowMs
): Promise<RateLimitResult> {
  const distributed = await consumeDistributed(key, maxAttempts, windowMs);
  if (distributed) return distributed;
  return consumeInMemory(key, maxAttempts, windowMs);
}
