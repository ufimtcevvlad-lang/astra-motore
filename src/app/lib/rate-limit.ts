const buckets = new Map<string, { count: number; resetAt: number }>();

function nowMs() {
  return Date.now();
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(opts: {
  request: Request;
  key: string;
  windowMs: number;
  max: number;
}) {
  const ip = getClientIp(opts.request);
  const bucketKey = `${opts.key}:${ip}`;
  const ts = nowMs();
  const current = buckets.get(bucketKey);

  if (!current || ts >= current.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: ts + opts.windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (current.count >= opts.max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - ts) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(bucketKey, current);
  return { allowed: true, retryAfterSec: 0 };
}
