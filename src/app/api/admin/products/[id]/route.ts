import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { getOrderUsageByProductIds } from "@/app/lib/products/order-usage";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";
import { findQrSeparatorProductImage } from "@/app/lib/qr-image-guard";
import { canonicalizeBrand } from "@/app/lib/brand-normalize";

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

function optionalText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value === null) return "";
  return undefined;
}

function optionalImage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value === null) return "";
  return undefined;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);

  const rows = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (rows.length === 0) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  const product = rows[0];

  const specs = await db
    .select()
    .from(schema.productSpecs)
    .where(eq(schema.productSpecs.productId, numId));

  const analogs = await db
    .select({
      id: schema.productAnalogs.id,
      analogId: schema.productAnalogs.analogId,
      analogName: schema.products.name,
      analogSku: schema.products.sku,
    })
    .from(schema.productAnalogs)
    .innerJoin(schema.products, eq(schema.productAnalogs.analogId, schema.products.id))
    .where(eq(schema.productAnalogs.productId, numId));

  let images: string[] = [];
  try {
    images = JSON.parse(product.images);
  } catch {
    images = [];
  }

  return adminJson({
    ...product,
    images,
    specs,
    analogs,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);
  const body = await req.json();

  const existing = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (existing.length === 0) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  // Валидация обязательных полей и числовых значений
  const nameStr = typeof body.name === "string" ? body.name.trim() : "";
  const skuStr = typeof body.sku === "string" ? body.sku.trim() : "";
  const brandStr = typeof body.brand === "string" ? canonicalizeBrand(body.brand) : "";
  if (!nameStr || !skuStr || !brandStr) {
    return adminJson(
      { error: "Заполните название, артикул и бренд" },
      { status: 400 }
    );
  }
  let priceOut: number | undefined;
  if (body.price != null) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) {
      return adminJson({ error: "Цена должна быть числом ≥ 0" }, { status: 400 });
    }
    priceOut = Math.round(p);
  }
  let inStockOut: number | undefined;
  if (body.inStock != null) {
    const s = Number(body.inStock);
    if (!Number.isFinite(s) || s < 0) {
      return adminJson({ error: "Остаток должен быть числом ≥ 0" }, { status: 400 });
    }
    inStockOut = Math.round(s);
  }

  const bodyImages = Array.isArray(body.images) ? body.images : undefined;
  const bodyImage = optionalImage(body.image);
  const blockedImage = await findQrSeparatorProductImage([bodyImage, ...(bodyImages ?? [])]);
  if (blockedImage) {
    return adminJson(
      { error: "В галерее есть QR-разделитель парсера. Удалите его из фото товара и сохраните снова." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  try {
    await db
      .update(schema.products)
      .set({
        sku: skuStr,
        name: nameStr,
        brand: brandStr,
        country: typeof body.country === "string" ? body.country : undefined,
        categoryId: body.categoryId === undefined ? undefined : body.categoryId,
        car: optionalText(body.car),
        price: priceOut,
        inStock: inStockOut,
        image: bodyImage,
        images: bodyImages ? JSON.stringify(bodyImages) : undefined,
        description: optionalText(body.description),
        longDescription:
          body.longDescription === undefined ? undefined : body.longDescription,
        hidden: typeof body.hidden === "boolean" ? body.hidden : undefined,
        updatedAt: now,
      })
      .where(eq(schema.products.id, numId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: products\.sku/i.test(msg)) {
      return adminJson(
        { error: `Артикул "${skuStr}" уже используется другим товаром.` },
        { status: 409 }
      );
    }
    return adminJson({ error: "Не удалось сохранить изменения" }, { status: 500 });
  }

  // Re-insert specs
  if (body.specs && Array.isArray(body.specs)) {
    await db
      .delete(schema.productSpecs)
      .where(eq(schema.productSpecs.productId, numId));

    if (body.specs.length > 0) {
      await db.insert(schema.productSpecs).values(
        body.specs.map((s: { label: string; value: string }, i: number) => ({
          productId: numId,
          label: s.label,
          value: s.value,
          sortOrder: i,
        }))
      );
    }
  }

  // Re-insert analogs
  if (body.analogs && Array.isArray(body.analogs)) {
    await db
      .delete(schema.productAnalogs)
      .where(eq(schema.productAnalogs.productId, numId));

    if (body.analogs.length > 0) {
      await db.insert(schema.productAnalogs).values(
        body.analogs.map((analogId: number) => ({
          productId: numId,
          analogId,
        }))
      );
    }
  }

  const updated = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));
  const saved = updated[0];

  if (!saved) {
    return adminJson({ error: "Товар не найден после сохранения" }, { status: 404 });
  }

  const expectedImages = bodyImages ? JSON.stringify(bodyImages) : undefined;
  const saveMismatch =
    saved.name !== nameStr ||
    saved.sku !== skuStr ||
    saved.brand !== brandStr ||
    (priceOut !== undefined && saved.price !== priceOut) ||
    (inStockOut !== undefined && saved.inStock !== inStockOut) ||
    (typeof body.hidden === "boolean" && saved.hidden !== body.hidden) ||
    (body.categoryId !== undefined && saved.categoryId !== body.categoryId) ||
    (optionalText(body.car) !== undefined && saved.car !== optionalText(body.car)) ||
    (optionalImage(body.image) !== undefined && saved.image !== optionalImage(body.image)) ||
    (expectedImages !== undefined && saved.images !== expectedImages) ||
    (optionalText(body.description) !== undefined && saved.description !== optionalText(body.description)) ||
    (body.longDescription !== undefined && saved.longDescription !== body.longDescription);

  if (saveMismatch) {
    console.error("Admin product save mismatch", {
      id: numId,
      expected: {
        sku: skuStr,
        name: nameStr,
        brand: brandStr,
        price: priceOut,
        inStock: inStockOut,
        categoryId: body.categoryId,
      },
      saved,
    });
    return adminJson(
      { error: "Сервер не подтвердил сохранение товара. Обновите страницу и попробуйте ещё раз." },
      { status: 500 },
    );
  }

  revalidatePublicProductPages([saved.slug].filter(Boolean) as string[]);

  return adminJson(saved);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);
  const force = req.nextUrl.searchParams.get("force") === "1";

  const existing = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (existing.length === 0) {
    return adminJson({ error: "Товар не найден" }, { status: 404 });
  }

  if (!force) {
    const usage = await getOrderUsageByProductIds([numId]);
    if (usage.length > 0) {
      return adminJson(
        {
          error: "product_used_in_orders",
          ordersCount: usage[0].ordersCount,
          message: `Этот товар есть в ${usage[0].ordersCount} заказ(ах). Удаление уберёт его из каталога, но названия в истории заказов сохранятся.`,
        },
        { status: 409 }
      );
    }
  }

  const deletedSlug = existing[0]?.slug;
  await db.delete(schema.products).where(eq(schema.products.id, numId));
  revalidatePublicProductPages(deletedSlug ? [deletedSlug] : []);
  return adminJson({ success: true });
}
