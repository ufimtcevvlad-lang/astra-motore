import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, sql, desc, asc, or } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("search")?.trim() || null;
  const status = url.searchParams.get("status") || null;
  const sort = url.searchParams.get("sort") || "lastOrder";

  // Build base conditions for orders
  const orderConditions: ReturnType<typeof eq>[] = [];
  if (search) {
    orderConditions.push(
      or(
        like(schema.orders.customerName, `%${search}%`),
        like(schema.orders.customerPhone, `%${search}%`),
        like(schema.orders.customerEmail, `%${search}%`)
      )!
    );
  }

  const orderWhere = orderConditions.length > 0 ? and(...orderConditions) : undefined;

  // Aggregate customers from orders, grouped by phone
  // Subquery: for each phone, get aggregated stats
  const customersRaw = db
    .select({
      customerPhone: schema.orders.customerPhone,
      customerName: sql<string>`(
        SELECT o2.customer_name FROM orders o2
        WHERE o2.customer_phone = ${schema.orders.customerPhone}
        ORDER BY o2.created_at DESC LIMIT 1
      )`,
      customerEmail: sql<string>`(
        SELECT o2.customer_email FROM orders o2
        WHERE o2.customer_phone = ${schema.orders.customerPhone}
        ORDER BY o2.created_at DESC LIMIT 1
      )`,
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`sum(${schema.orders.total})`,
      lastOrderDate: sql<string>`max(${schema.orders.createdAt})`,
    })
    .from(schema.orders)
    .where(orderWhere)
    .groupBy(schema.orders.customerPhone)
    .all();

  // Get all customer notes for status filtering and display
  const allNotes = db
    .select()
    .from(schema.customerNotes)
    .all();

  const notesMap = new Map(allNotes.map((n) => [n.customerPhone, n]));

  // Merge customers with notes
  let customers = customersRaw.map((c) => {
    const note = notesMap.get(c.customerPhone);
    return {
      phone: c.customerPhone,
      name: c.customerName || "",
      email: c.customerEmail || "",
      orderCount: Number(c.orderCount),
      totalSpent: Number(c.totalSpent),
      lastOrderDate: c.lastOrderDate,
      status: note?.status || "new",
    };
  });

  // Filter by status
  if (status) {
    customers = customers.filter((c) => c.status === status);
  }

  // Sort
  switch (sort) {
    case "totalSpent":
      customers.sort((a, b) => b.totalSpent - a.totalSpent);
      break;
    case "orderCount":
      customers.sort((a, b) => b.orderCount - a.orderCount);
      break;
    case "lastOrder":
    default:
      customers.sort((a, b) => (b.lastOrderDate || "").localeCompare(a.lastOrderDate || ""));
      break;
  }

  const total = customers.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;
  const paged = customers.slice(offset, offset + PAGE_SIZE);

  return NextResponse.json({ customers: paged, total, page, totalPages });
}
