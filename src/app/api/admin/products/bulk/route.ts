import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { inArray, sql } from "drizzle-orm";
import { getOrderUsageByProductIds } from "@/app/lib/products/order-usage";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

const MAX_BULK = 500;
const PRICE_DELTA_MIN = -90; // не ниже 10% от текущей цены
const PRICE_DELTA_MAX = 500; // не выше +500%

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
};

function adminJson<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

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
    return adminJson({ error: "Не выбраны товары" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return adminJson(
      { error: `Слишком много товаров за раз (${ids.length}). Лимит — ${MAX_BULK}.` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  let verify:
    | ((row: {
        price: number;
        inStock: number;
        hidden: boolean;
        categoryId: number | null;
      }) => boolean)
    | null = null;

  switch (body.action.type) {
    case "setInStock": {
      const value = Math.round(Number(body.action.value) || 0);
      await db
        .update(schema.products)
        .set({ inStock: value, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      verify = (row) => row.inStock === value;
      break;
    }
    case "setCategory": {
      const value = body.action.categoryId;
      await db
        .update(schema.products)
        .set({ categoryId: value, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      verify = (row) => row.categoryId === value;
      break;
    }
    case "priceSet": {
      const v = Number(body.action.value);
      if (!Number.isFinite(v) || v < 0) {
        return adminJson({ error: "Цена должна быть числом ≥ 0" }, { status: 400 });
      }
      const value = Math.round(v);
      await db
        .update(schema.products)
        .set({ price: value, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      verify = (row) => row.price === value;
      break;
    }
    case "setHidden": {
      const value = Boolean(body.action.value);
      await db
        .update(schema.products)
        .set({ hidden: value, updatedAt: now })
        .where(inArray(schema.products.id, ids));
      verify = (row) => row.hidden === value;
      break;
    }
    case "priceDelta": {
      const percent = Number(body.action.percent);
      if (!Number.isFinite(percent) || percent === 0) {
        return adminJson({ error: "Укажите % изменения цены" }, { status: 400 });
      }
      if (percent < PRICE_DELTA_MIN || percent > PRICE_DELTA_MAX) {
        return adminJson(
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
      return adminJson({ error: "Неизвестное действие" }, { status: 400 });
  }

  if (verify) {
    const savedRows = await db
      .select({
        id: schema.products.id,
        price: schema.products.price,
        inStock: schema.products.inStock,
        hidden: schema.products.hidden,
        categoryId: schema.products.categoryId,
      })
      .from(schema.products)
      .where(inArray(schema.products.id, ids));

    if (savedRows.length !== ids.length || savedRows.some((row) => !verify?.(row))) {
      console.error("Admin bulk save mismatch", { ids, action: body.action, savedRows });
      return adminJson(
        { error: "Сервер не подтвердил массовое сохранение. Обновите страницу и попробуйте ещё раз." },
        { status: 500 }
      );
    }
  }

  revalidatePublicProductPages();

  return adminJson({ success: true, count: ids.length });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (ids.length === 0) {
    return adminJson({ error: "Не выбраны товары" }, { status: 400 });
  }
  if (ids.length > MAX_BULK) {
    return adminJson(
      { error: `Слишком много товаров за раз (${ids.length}). Лимит — ${MAX_BULK}.` },
      { status: 400 }
    );
  }

  if (!force) {
    const usage = await getOrderUsageByProductIds(ids);
    if (usage.length > 0) {
      const totalOrders = usage.reduce((s, e) => s + e.ordersCount, 0);
      return adminJson(
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
  return adminJson({ success: true, count: ids.length });
}
