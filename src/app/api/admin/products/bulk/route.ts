import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { inArray, sql } from "drizzle-orm";

interface BulkPatchBody {
  ids: number[];
  action:
    | { type: "setInStock"; value: number }
    | { type: "setCategory"; categoryId: number | null }
    | { type: "priceDelta"; percent: number }
    | { type: "priceSet"; value: number };
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = (await req.json()) as BulkPatchBody;
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Не выбраны товары" }, { status: 400 });
  }

  const now = new Date().toISOString();

  switch (body.action.type) {
    case "setInStock": {
      await db
        .update(schema.products)
        .set({ inStock: Number(body.action.value) || 0, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      break;
    }
    case "setCategory": {
      await db
        .update(schema.products)
        .set({ categoryId: body.action.categoryId, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      break;
    }
    case "priceSet": {
      await db
        .update(schema.products)
        .set({ price: Number(body.action.value), updatedAt: now })
        .where(inArray(schema.products.id, ids));
      break;
    }
    case "priceDelta": {
      const factor = 1 + Number(body.action.percent) / 100;
      await db
        .update(schema.products)
        .set({
          price: sql`CAST(ROUND(${schema.products.price} * ${factor}) AS INTEGER)`,
          updatedAt: now,
        })
        .where(inArray(schema.products.id, ids));
      break;
    }
    default:
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  return NextResponse.json({ success: true, count: ids.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Не выбраны товары" }, { status: 400 });
  }

  await db.delete(schema.products).where(inArray(schema.products.id, ids));
  return NextResponse.json({ success: true, count: ids.length });
}
