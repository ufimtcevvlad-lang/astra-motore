import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { sql, gte, and, lte, desc, eq } from "drizzle-orm";

type MetrikaTopProductsResponse = {
  data?: Array<{
    dimensions?: Array<{ name?: string }>;
    metrics?: number[];
  }>;
};

// In-memory cache with 5-minute TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();
function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (e && e.expiresAt > Date.now()) return e.data as T;
  return null;
}
function setCache<T>(key: string, data: T) {
  cache.set(key, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
}

function getPeriodDays(period: string): number {
  switch (period) {
    case "1d": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
}

async function fetchMetrikaTopProducts(token: string, counterId: string, dateFrom: string, dateTo: string): Promise<MetrikaTopProductsResponse | null> {
  const cacheKey = `metrika:top:${counterId}:${dateFrom}:${dateTo}`;
  const cached = getCached<MetrikaTopProductsResponse>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    id: counterId,
    metrics: "ym:s:pageviews",
    dimensions: "ym:s:startURL",
    date1: dateFrom,
    date2: dateTo,
    filters: "EXISTS ym:s:startURL=.*/product/.*",
    sort: "-ym:s:pageviews",
    limit: "5",
  });

  const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${params}`, {
    headers: { Authorization: `OAuth ${token}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as MetrikaTopProductsResponse;
  setCache(cacheKey, data);
  return data;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const days = getPeriodDays(period);

    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = new Date().toISOString().split("T")[0];

    // Check Metrika config
    const metrikaTokenRow = db
      .select()
      .from(schema.settings)
      .where(sql`${schema.settings.key} = 'metrika_token'`)
      .get();
    const metrikaCounterRow = db
      .select()
      .from(schema.settings)
      .where(sql`${schema.settings.key} = 'metrika_counter_id'`)
      .get();

    const metrikaToken = metrikaTokenRow?.value;
    const metrikaCounterId = metrikaCounterRow?.value;

    // Try Metrika first
    if (metrikaToken && metrikaCounterId) {
      const metrikaData = await fetchMetrikaTopProducts(
        metrikaToken,
        metrikaCounterId,
        fromStr,
        toStr
      );

      if (metrikaData?.data) {
        const products = metrikaData.data.map((row) => {
          const url: string = row.dimensions?.[0]?.name ?? "";
          // Extract product name from URL or use URL
          const slug = url.split("/product/")[1]?.split("?")[0] ?? url;
          return {
            name: decodeURIComponent(slug).replace(/-/g, " "),
            views: row.metrics?.[0] ?? 0,
          };
        });

        return NextResponse.json({ products, source: "metrika" });
      }
    }

    // Fallback: use productViews table
    const rows = db
      .select({
        name: schema.products.name,
        views: sql<number>`coalesce(sum(${schema.productViews.viewCount}), 0)`.as("total_views"),
      })
      .from(schema.productViews)
      .innerJoin(schema.products, eq(schema.productViews.productId, schema.products.id))
      .where(
        and(
          gte(schema.productViews.date, fromStr),
          lte(schema.productViews.date, toStr)
        )
      )
      .groupBy(schema.products.id, schema.products.name)
      .orderBy(desc(sql`total_views`))
      .limit(5)
      .all();

    const products = rows.map((r) => ({
      name: r.name,
      views: r.views,
    }));

    return NextResponse.json({ products, source: "local" });
  } catch (error) {
    console.error("Top products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch top products" },
      { status: 500 }
    );
  }
}
