import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "data", "shop.db");
let _db: Database.Database | null = null;
let _callCount = 0;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        bucket_key TEXT PRIMARY KEY,
        count       INTEGER NOT NULL DEFAULT 1,
        reset_at    INTEGER NOT NULL
      )
    `);
  }
  return _db;
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
}): { allowed: boolean; retryAfterSec: number } {
  const db = getDb();
  const ip = getClientIp(opts.request);
  const bucketKey = `${opts.key}:${ip}`;
  const now = Date.now();
  const resetAt = now + opts.windowMs;

  // Periodic cleanup every 100 calls
  _callCount += 1;
  if (_callCount % 100 === 0) {
    db.prepare("DELETE FROM rate_limits WHERE reset_at <= ?").run(now);
  }

  const row = db
    .prepare<[string], { count: number; reset_at: number }>(
      "SELECT count, reset_at FROM rate_limits WHERE bucket_key = ?"
    )
    .get(bucketKey);

  if (!row || now >= row.reset_at) {
    db.prepare(`
      INSERT INTO rate_limits (bucket_key, count, reset_at)
      VALUES (?, 1, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET count = 1, reset_at = excluded.reset_at
    `).run(bucketKey, resetAt);
    return { allowed: true, retryAfterSec: 0 };
  }

  if (row.count >= opts.max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((row.reset_at - now) / 1000)),
    };
  }

  db.prepare(
    "UPDATE rate_limits SET count = count + 1 WHERE bucket_key = ?"
  ).run(bucketKey);
  return { allowed: true, retryAfterSec: 0 };
}
