import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, gte, lte, sql, desc, or } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("search")?.trim() || null;
  const status = url.searchParams.get("status") || null;
  const paymentMethod = url.searchParams.get("paymentMethod") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.orders.orderNumber, `%${search}%`),
        like(schema.orders.customerName, `%${search}%`),
        like(schema.orders.customerPhone, `%${search}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(schema.orders.status, status));
  }
  if (paymentMethod) {
    conditions.push(eq(schema.orders.paymentMethod, paymentMethod));
  }
  if (dateFrom) {
    conditions.push(gte(schema.orders.createdAt, dateFrom + "T00:00:00"));
  }
  if (dateTo) {
    conditions.push(lte(schema.orders.createdAt, dateTo + "T23:59:59"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count for current filter
  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(where)
    .all();

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  // Status counts for tabs (respect all filters EXCEPT status)
  const baseWhere = (() => {
    const conds = [];
    if (search) {
      conds.push(
        or(
          like(schema.orders.orderNumber, `%${search}%`),
          like(schema.orders.customerName, `%${search}%`),
          like(schema.orders.customerPhone, `%${search}%`)
        )
      );
    }
    if (paymentMethod) conds.push(eq(schema.orders.paymentMethod, paymentMethod));
    if (dateFrom) conds.push(gte(schema.orders.createdAt, dateFrom + "T00:00:00"));
    if (dateTo) conds.push(lte(schema.orders.createdAt, dateTo + "T23:59:59"));
    return conds.length > 0 ? and(...conds) : undefined;
  })();

  const statusCountsRaw = db
    .select({
      status: schema.orders.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.orders)
    .where(baseWhere)
    .groupBy(schema.orders.status)
    .all();

  const statusCounts: Record<string, number> = { all: 0, new: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const row of statusCountsRaw) {
    statusCounts[row.status] = Number(row.count);
    statusCounts.all += Number(row.count);
  }

  const orders = db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      customerName: schema.orders.customerName,
      customerPhone: schema.orders.customerPhone,
      items: schema.orders.items,
      total: schema.orders.total,
      deliveryMethod: schema.orders.deliveryMethod,
      deliveryCity: schema.orders.deliveryCity,
      paymentMethod: schema.orders.paymentMethod,
      status: schema.orders.status,
      isUrgent: schema.orders.isUrgent,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(where)
    .orderBy(desc(schema.orders.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  // Parse items for brief display
  const ordersWithItems = orders.map((o) => {
    let itemsSummary = "";
    try {
      const parsed = JSON.parse(o.items);
      itemsSummary = parsed
        .map((it: { name: string; quantity: number }) => {
          const short = it.name.length > 20 ? it.name.slice(0, 20) + "…" : it.name;
          return `${short} ×${it.quantity}`;
        })
        .join(", ");
    } catch { /* empty */ }
    return { ...o, items: undefined, itemsSummary };
  });

  return NextResponse.json({ orders: ordersWithItems, total, page, totalPages, statusCounts });
}
