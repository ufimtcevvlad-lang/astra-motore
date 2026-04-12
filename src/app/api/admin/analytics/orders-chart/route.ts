import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { sql, gte, and, lte } from "drizzle-orm";

function getPeriodDays(period: string): number {
  switch (period) {
    case "1d": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
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
    const fromStr = from.toISOString();
    const toStr = new Date().toISOString();

    // Group orders by date
    const rows = db
      .select({
        date: sql<string>`date(${schema.orders.createdAt})`.as("order_date"),
        orders: sql<number>`count(*)`.as("order_count"),
        revenue: sql<number>`coalesce(sum(${schema.orders.total}), 0)`.as("order_revenue"),
      })
      .from(schema.orders)
      .where(
        and(
          gte(schema.orders.createdAt, fromStr),
          lte(schema.orders.createdAt, toStr)
        )
      )
      .groupBy(sql`date(${schema.orders.createdAt})`)
      .orderBy(sql`date(${schema.orders.createdAt})`)
      .all();

    // Fill in missing dates with zeros
    const dataMap = new Map<string, { orders: number; revenue: number }>();
    for (const row of rows) {
      dataMap.set(row.date, { orders: row.orders, revenue: row.revenue });
    }

    const data: { date: string; orders: number; revenue: number }[] = [];
    const cursor = new Date(from);
    const end = new Date();

    while (cursor <= end) {
      const dateKey = cursor.toISOString().split("T")[0];
      const entry = dataMap.get(dateKey);
      data.push({
        date: dateKey,
        orders: entry?.orders ?? 0,
        revenue: entry?.revenue ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Orders chart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
