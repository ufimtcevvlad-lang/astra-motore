import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);

  const [order] = db
    .select({ isUrgent: schema.orders.isUrgent })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  db.update(schema.orders)
    .set({ isUrgent: !order.isUrgent, updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, orderId))
    .run();

  return NextResponse.json({ ok: true, isUrgent: !order.isUrgent });
}
