type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory rate limit (per server instance).
 * Good enough to stop accidental spam / double-clicks on free Gemini quota.
 */
export function consumeRateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true };
}

export function clientKeyFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}
