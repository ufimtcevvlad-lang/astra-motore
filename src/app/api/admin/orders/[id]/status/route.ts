import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["new", "processing", "shipped", "delivered", "cancelled"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  const body = await req.json();

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const [order] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const now = new Date().toISOString();

  db.update(schema.orders)
    .set({ status: body.status, updatedAt: now })
    .where(eq(schema.orders.id, orderId))
    .run();

  db.insert(schema.orderStatusHistory).values({
    orderId,
    status: body.status,
    comment: body.comment?.trim() ?? "",
    adminId: auth.admin.id,
    createdAt: now,
  }).run();

  return NextResponse.json({ ok: true });
}
