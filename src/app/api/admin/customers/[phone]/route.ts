import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, sql, desc } from "drizzle-orm";

const ORDERS_PAGE_SIZE = 10;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { phone } = await params;
  const decodedPhone = decodeURIComponent(phone);

  const url = req.nextUrl;
  const ordersPage = Math.max(1, Number(url.searchParams.get("page") ?? 1));

  // Aggregate stats from orders
  const [stats] = db
    .select({
      customerName: sql<string>`(
        SELECT o2.customer_name FROM orders o2
        WHERE o2.customer_phone = ${decodedPhone}
        ORDER BY o2.created_at DESC LIMIT 1
      )`,
      customerEmail: sql<string>`(
        SELECT o2.customer_email FROM orders o2
        WHERE o2.customer_phone = ${decodedPhone}
        ORDER BY o2.created_at DESC LIMIT 1
      )`,
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`sum(${schema.orders.total})`,
      lastOrderDate: sql<string>`max(${schema.orders.createdAt})`,
    })
    .from(schema.orders)
    .where(eq(schema.orders.customerPhone, decodedPhone))
    .all();

  if (!stats || Number(stats.orderCount) === 0) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Get customer notes
  const [notes] = db
    .select()
    .from(schema.customerNotes)
    .where(eq(schema.customerNotes.customerPhone, decodedPhone))
    .all();

  const orderCount = Number(stats.orderCount);
  const totalSpent = Number(stats.totalSpent);
  const avgCheck = orderCount > 0 ? Math.round(totalSpent / orderCount) : 0;

  const customer = {
    name: stats.customerName || "",
    phone: decodedPhone,
    email: stats.customerEmail || "",
    status: notes?.status || "new",
    carModels: notes?.carModels || "",
    notes: notes?.notes || "",
    orderCount,
    totalSpent,
    avgCheck,
    lastOrderDate: stats.lastOrderDate,
  };

  // Paginated orders
  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(eq(schema.orders.customerPhone, decodedPhone))
    .all();

  const totalOrders = Number(countResult.count);
  const totalOrderPages = Math.ceil(totalOrders / ORDERS_PAGE_SIZE);
  const offset = (ordersPage - 1) * ORDERS_PAGE_SIZE;

  const ordersRaw = db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      items: schema.orders.items,
      total: schema.orders.total,
      status: schema.orders.status,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(eq(schema.orders.customerPhone, decodedPhone))
    .orderBy(desc(schema.orders.createdAt))
    .limit(ORDERS_PAGE_SIZE)
    .offset(offset)
    .all();

  const orders = ordersRaw.map((o) => {
    let itemsSummary = "";
    try {
      const parsed = JSON.parse(o.items);
      itemsSummary = parsed
        .map((it: { name: string; quantity: number }) => {
          const short = it.name.length > 25 ? it.name.slice(0, 25) + "\u2026" : it.name;
          return `${short} \u00d7${it.quantity}`;
        })
        .join(", ");
    } catch { /* empty */ }
    return { id: o.id, orderNumber: o.orderNumber, itemsSummary, total: o.total, status: o.status, createdAt: o.createdAt };
  });

  return NextResponse.json({ customer, orders, totalOrders, totalOrderPages });
}
