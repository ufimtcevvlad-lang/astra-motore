import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

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

  const now = new Date().toISOString();

  await db
    .update(schema.products)
    .set({
      sku: body.sku,
      name: body.name,
      brand: body.brand,
      country: body.country,
      categoryId: body.categoryId,
      car: body.car,
      price: body.price != null ? Number(body.price) : undefined,
      inStock: body.inStock,
      image: body.image,
      images: body.images ? JSON.stringify(body.images) : undefined,
      description: body.description,
      longDescription: body.longDescription,
      updatedAt: now,
    })
    .where(eq(schema.products.id, numId));

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

  return NextResponse.json(updated[0]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);

  const existing = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  await db.delete(schema.products).where(eq(schema.products.id, numId));
  return NextResponse.json({ success: true });
}
