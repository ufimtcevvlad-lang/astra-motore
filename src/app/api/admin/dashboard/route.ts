import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { gte, desc, eq, and, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function yesterdayStart() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const todayISO = todayStart();
  const yesterdayISO = yesterdayStart();

  // Orders today
  const ordersTodayRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, todayISO));
  const ordersToday = Number(ordersTodayRows[0]?.count ?? 0);

  // Orders yesterday
  const ordersYesterdayRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(
      and(
        gte(schema.orders.createdAt, yesterdayISO),
        lt(schema.orders.createdAt, todayISO)
      )
    );
  const ordersYesterday = Number(ordersYesterdayRows[0]?.count ?? 0);

  // Revenue today
  const revenueTodayRows = await db
    .select({ total: sql<number>`coalesce(sum(total), 0)` })
    .from(schema.orders)
    .where(
      and(
        gte(schema.orders.createdAt, todayISO),
        sql`status != 'cancelled'`
      )
    );
  const revenueToday = Number(revenueTodayRows[0]?.total ?? 0);

  // Revenue yesterday
  const revenueYesterdayRows = await db
    .select({ total: sql<number>`coalesce(sum(total), 0)` })
    .from(schema.orders)
    .where(
      and(
        gte(schema.orders.createdAt, yesterdayISO),
        lt(schema.orders.createdAt, todayISO),
        sql`status != 'cancelled'`
      )
    );
  const revenueYesterday = Number(revenueYesterdayRows[0]?.total ?? 0);

  // New conversations
  const newConvRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(eq(schema.conversations.status, "new"));
  const newConversations = Number(newConvRows[0]?.count ?? 0);

  // Total products
  const totalProductsRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.inStock, 1));
  const totalProducts = Number(totalProductsRows[0]?.count ?? 0);

  // Recent 5 orders
  const recentOrders = await db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      customerName: schema.orders.customerName,
      total: schema.orders.total,
      status: schema.orders.status,
    })
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt))
    .limit(5);

  return NextResponse.json({
    ordersToday,
    ordersYesterday,
    revenueToday,
    revenueYesterday,
    newConversations,
    totalProducts,
    recentOrders,
  });
}
