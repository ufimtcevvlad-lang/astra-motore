import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { getOrderUsageByProductIds } from "@/app/lib/products/order-usage";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";
import { findQrSeparatorProductImage } from "@/app/lib/qr-image-guard";

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
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
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

  return NextResponse.json({
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
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  // Валидация обязательных полей и числовых значений
  const nameStr = typeof body.name === "string" ? body.name.trim() : "";
  const skuStr = typeof body.sku === "string" ? body.sku.trim() : "";
  const brandStr = typeof body.brand === "string" ? body.brand.trim() : "";
  if (!nameStr || !skuStr || !brandStr) {
    return NextResponse.json(
      { error: "Заполните название, артикул и бренд" },
      { status: 400 }
    );
  }
  let priceOut: number | undefined;
  if (body.price != null) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: "Цена должна быть числом ≥ 0" }, { status: 400 });
    }
    priceOut = Math.round(p);
  }
  let inStockOut: number | undefined;
  if (body.inStock != null) {
    const s = Number(body.inStock);
    if (!Number.isFinite(s) || s < 0) {
      return NextResponse.json({ error: "Остаток должен быть числом ≥ 0" }, { status: 400 });
    }
    inStockOut = Math.round(s);
  }

  const bodyImages = Array.isArray(body.images) ? body.images : undefined;
  const bodyImage = typeof body.image === "string" ? body.image : undefined;
  const blockedImage = await findQrSeparatorProductImage([bodyImage, ...(bodyImages ?? [])]);
  if (blockedImage) {
    return NextResponse.json(
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
        car: typeof body.car === "string" ? body.car : undefined,
        price: priceOut,
        inStock: inStockOut,
        image: bodyImage,
        images: bodyImages ? JSON.stringify(bodyImages) : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        longDescription:
          body.longDescription === undefined ? undefined : body.longDescription,
        hidden: typeof body.hidden === "boolean" ? body.hidden : undefined,
        updatedAt: now,
      })
      .where(eq(schema.products.id, numId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: products\.sku/i.test(msg)) {
      return NextResponse.json(
        { error: `Артикул "${skuStr}" уже используется другим товаром.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Не удалось сохранить изменения" }, { status: 500 });
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

  revalidatePublicProductPages([updated[0]?.slug].filter(Boolean) as string[]);

  return NextResponse.json(updated[0]);
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
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  if (!force) {
    const usage = await getOrderUsageByProductIds([numId]);
    if (usage.length > 0) {
      return NextResponse.json(
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
  return NextResponse.json({ success: true });
}
