import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);

  const [order] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const statusHistory = db
    .select({
      id: schema.orderStatusHistory.id,
      status: schema.orderStatusHistory.status,
      comment: schema.orderStatusHistory.comment,
      adminId: schema.orderStatusHistory.adminId,
      adminName: schema.admins.name,
      createdAt: schema.orderStatusHistory.createdAt,
    })
    .from(schema.orderStatusHistory)
    .leftJoin(schema.admins, eq(schema.orderStatusHistory.adminId, schema.admins.id))
    .where(eq(schema.orderStatusHistory.orderId, orderId))
    .orderBy(desc(schema.orderStatusHistory.createdAt))
    .all();

  // Customer stats by phone
  const [customerStats] = db
    .select({
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`sum(total)`,
    })
    .from(schema.orders)
    .where(eq(schema.orders.customerPhone, order.customerPhone))
    .all();

  // Parse JSON fields
  let items = [];
  try { items = JSON.parse(order.items); } catch { /* empty */ }
  let deliveryQuote = null;
  try { if (order.deliveryQuote) deliveryQuote = JSON.parse(order.deliveryQuote); } catch { /* empty */ }
  let cdekPickupPoint = null;
  try { if (order.cdekPickupPoint) cdekPickupPoint = JSON.parse(order.cdekPickupPoint); } catch { /* empty */ }

  return NextResponse.json({
    order: { ...order, items, deliveryQuote, cdekPickupPoint },
    statusHistory,
    customerStats: {
      orderCount: Number(customerStats.orderCount),
      totalSpent: Number(customerStats.totalSpent ?? 0),
    },
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  const body = await req.json();

  const [existing] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!existing) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.customerName !== undefined) updates.customerName = body.customerName.trim();
  if (body.customerPhone !== undefined) updates.customerPhone = body.customerPhone.trim();
  if (body.customerEmail !== undefined) updates.customerEmail = body.customerEmail.trim();
  if (body.items !== undefined) {
    updates.items = JSON.stringify(body.items);
    const newTotal = body.items.reduce((acc: number, it: { sum: number }) => acc + it.sum, 0);
    updates.total = newTotal;
  }
  if (body.deliveryMethod !== undefined) updates.deliveryMethod = body.deliveryMethod;
  if (body.deliveryCity !== undefined) updates.deliveryCity = body.deliveryCity;
  if (body.deliveryAddress !== undefined) updates.deliveryAddress = body.deliveryAddress;
  if (body.deliveryCost !== undefined) updates.deliveryCost = body.deliveryCost;
  if (body.cdekPickupPoint !== undefined) {
    updates.cdekPickupPoint = body.cdekPickupPoint ? JSON.stringify(body.cdekPickupPoint) : null;
  }
  if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
  if (body.comment !== undefined) updates.comment = body.comment;

  db.update(schema.orders)
    .set(updates)
    .where(eq(schema.orders.id, orderId))
    .run();

  return NextResponse.json({ ok: true });
}
