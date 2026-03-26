import { NextResponse } from "next/server";
import { searchCatalogProducts } from "../../../lib/catalog-search";

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 200;

type CachedEntry = {
  expiresAt: number;
  payload: { query: string; results: ReturnType<typeof searchCatalogProducts> };
};

const searchCache = new Map<string, CachedEntry>();

function cacheKey(query: string, limit: number): string {
  return `${query}::${limit}`;
}

function cleanupExpired(now: number): void {
  for (const [key, entry] of searchCache.entries()) {
    if (entry.expiresAt <= now) searchCache.delete(key);
  }
}

function trimCacheIfNeeded(): void {
  if (searchCache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKey = searchCache.keys().next().value;
  if (oldestKey) searchCache.delete(oldestKey);
}

export async function GET(req: Request) {
  const startedAt = performance.now();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const query = q.trim();
  const limitRaw = searchParams.get("limit");
  const debug = searchParams.get("debug") === "1";
  const limit = Math.min(24, Math.max(1, parseInt(limitRaw ?? "8", 10) || 8));
  const key = cacheKey(query.toLowerCase(), limit);
  const now = Date.now();

  cleanupExpired(now);
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > now) {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    if (debug) {
      return NextResponse.json({
        ...cached.payload,
        meta: { durationMs, limit, cache: "hit" },
      });
    }
    return NextResponse.json(cached.payload);
  }

  const results = searchCatalogProducts(query, limit);
  const payload = { query, results };
  searchCache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
  trimCacheIfNeeded();
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;

  if (debug) {
    return NextResponse.json({ ...payload, meta: { durationMs, limit, cache: "miss" } });
  }

  return NextResponse.json(payload);
}
