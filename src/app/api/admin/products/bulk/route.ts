import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { inArray, sql } from "drizzle-orm";
import { getOrderUsageByProductIds } from "@/app/lib/products/order-usage";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

const MAX_BULK = 500;
const PRICE_DELTA_MIN = -90; // не ниже 10% от текущей цены
const PRICE_DELTA_MAX = 500; // не выше +500%

interface BulkPatchBody {
  ids: number[];
  action:
    | { type: "setInStock"; value: number }
    | { type: "setCategory"; categoryId: number | null }
    | { type: "priceDelta"; percent: number }
    | { type: "priceSet"; value: number }
    | { type: "setHidden"; value: boolean };
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = (await req.json()) as BulkPatchBody;
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Не выбраны товары" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Слишком много товаров за раз (${ids.length}). Лимит — ${MAX_BULK}.` },
      { status: 400 }
    );
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
      const v = Number(body.action.value);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "Цена должна быть числом ≥ 0" }, { status: 400 });
      }
      await db
        .update(schema.products)
        .set({ price: Math.round(v), updatedAt: now })
        .where(inArray(schema.products.id, ids));
      break;
    }
    case "setHidden": {
      await db
        .update(schema.products)
        .set({ hidden: Boolean(body.action.value), updatedAt: now })
        .where(inArray(schema.products.id, ids));
      break;
    }
    case "priceDelta": {
      const percent = Number(body.action.percent);
      if (!Number.isFinite(percent) || percent === 0) {
        return NextResponse.json({ error: "Укажите % изменения цены" }, { status: 400 });
      }
      if (percent < PRICE_DELTA_MIN || percent > PRICE_DELTA_MAX) {
        return NextResponse.json(
          { error: `% изменения цены должен быть в диапазоне от ${PRICE_DELTA_MIN} до +${PRICE_DELTA_MAX}.` },
          { status: 400 }
        );
      }
      const factor = 1 + percent / 100;
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

  revalidatePublicProductPages();

  return NextResponse.json({ success: true, count: ids.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (ids.length === 0) {
    return NextResponse.json({ error: "Не выбраны товары" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return NextResponse.json(
      { error: `Слишком много товаров за раз (${ids.length}). Лимит — ${MAX_BULK}.` },
      { status: 400 }
    );
  }

  if (!force) {
    const usage = await getOrderUsageByProductIds(ids);
    if (usage.length > 0) {
      const totalOrders = usage.reduce((s, e) => s + e.ordersCount, 0);
      return NextResponse.json(
        {
          error: "product_used_in_orders",
          usedCount: usage.length,
          ordersCount: totalOrders,
          message: `${usage.length} из выбранных товаров встречаются в заказах (всего ${totalOrders}). Удаление уберёт их из каталога, истории заказов не затронет.`,
        },
        { status: 409 }
      );
    }
  }

  await db.delete(schema.products).where(inArray(schema.products.id, ids));
  revalidatePublicProductPages();
  return NextResponse.json({ success: true, count: ids.length });
}
