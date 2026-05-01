import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { sql, gte, and, lte } from "drizzle-orm";

type MetrikaTotalsResponse = {
  totals?: number[];
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

function getDateRange(days: number): { from: string; to: string; prevFrom: string; prevTo: string } {
  const now = new Date();
  const to = now.toISOString();

  const from = new Date(now);
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString();

  const prevTo = fromStr;
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  const prevFromStr = prevFrom.toISOString();

  return { from: fromStr, to, prevFrom: prevFromStr, prevTo };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function fetchMetrika(token: string, counterId: string, metrics: string, dateFrom: string, dateTo: string): Promise<MetrikaTotalsResponse | null> {
  const cacheKey = `metrika:${counterId}:${metrics}:${dateFrom}:${dateTo}`;
  const cached = getCached<MetrikaTotalsResponse>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    id: counterId,
    metrics,
    date1: dateFrom,
    date2: dateTo,
  });

  const res = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${params}`, {
    headers: { Authorization: `OAuth ${token}` },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as MetrikaTotalsResponse;
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
    const { from, to, prevFrom, prevTo } = getDateRange(days);

    // DB stats: current period
    const ordersCurrentResult = db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${schema.orders.total}), 0)`,
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, from),
          lte(schema.orders.createdAt, to)
        )
      )
      .get();

    // DB stats: previous period
    const ordersPrevResult = db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${schema.orders.total}), 0)`,
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, prevFrom),
          lte(schema.orders.createdAt, prevTo)
        )
      )
      .get();

    const ordersCount = ordersCurrentResult?.count ?? 0;
    const revenue = ordersCurrentResult?.total ?? 0;
    const prevOrdersCount = ordersPrevResult?.count ?? 0;
    const prevRevenue = ordersPrevResult?.total ?? 0;

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
    const metrikaConnected = !!(metrikaToken && metrikaCounterId);

    let visitors = 0;
    let pageviews = 0;
    let prevVisitors = 0;
    let prevPageviews = 0;

    if (metrikaConnected) {
      const dateFromStr = from.split("T")[0];
      const dateToStr = to.split("T")[0];
      const prevDateFromStr = prevFrom.split("T")[0];
      const prevDateToStr = prevTo.split("T")[0];

      // Current period
      const currentData = await fetchMetrika(
        metrikaToken!,
        metrikaCounterId!,
        "ym:s:visits,ym:s:users,ym:s:pageviews",
        dateFromStr,
        dateToStr
      );

      if (currentData?.totals) {
        visitors = currentData.totals[1] ?? 0;
        pageviews = currentData.totals[2] ?? 0;
      }

      // Previous period
      const prevData = await fetchMetrika(
        metrikaToken!,
        metrikaCounterId!,
        "ym:s:visits,ym:s:users,ym:s:pageviews",
        prevDateFromStr,
        prevDateToStr
      );

      if (prevData?.totals) {
        prevVisitors = prevData.totals[1] ?? 0;
        prevPageviews = prevData.totals[2] ?? 0;
      }
    }

    return NextResponse.json({
      visitors,
      pageviews,
      orders: ordersCount,
      revenue,
      visitorsChange: calcChange(visitors, prevVisitors),
      pageviewsChange: calcChange(pageviews, prevPageviews),
      ordersChange: calcChange(ordersCount, prevOrdersCount),
      revenueChange: calcChange(revenue, prevRevenue),
      metrikaConnected,
    });
  } catch (error) {
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
