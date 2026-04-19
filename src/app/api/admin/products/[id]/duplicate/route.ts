import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { generateUniqueProductSlug } from "@/app/lib/products-db";
import { ensureProductDir } from "@/app/lib/product-images";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const numId = Number(id);

  const [src] = await db
    .select()
    .from(schema.products)
    .where(eq(schema.products.id, numId));

  if (!src) {
    return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const externalId = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const copySku = `${src.sku}-copy`;
  const copyName = `${src.name} (копия)`;
  const slug = generateUniqueProductSlug({ name: copyName, brand: src.brand, sku: copySku });

  const [copy] = await db
    .insert(schema.products)
    .values({
      externalId,
      slug,
      sku: copySku,
      name: copyName,
      brand: src.brand,
      country: src.country,
      categoryId: src.categoryId,
      car: src.car,
      price: src.price,
      inStock: 0,
      image: src.image,
      images: src.images,
      description: src.description,
      longDescription: src.longDescription,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const specs = await db
    .select()
    .from(schema.productSpecs)
    .where(eq(schema.productSpecs.productId, numId));

  if (specs.length > 0) {
    await db.insert(schema.productSpecs).values(
      specs.map((s) => ({
        productId: copy.id,
        label: s.label,
        value: s.value,
        sortOrder: s.sortOrder,
      }))
    );
  }

  ensureProductDir(copySku);
  revalidatePublicProductPages([slug]);

  return NextResponse.json(copy, { status: 201 });
}
