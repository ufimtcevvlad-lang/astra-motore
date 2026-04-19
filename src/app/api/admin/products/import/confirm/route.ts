import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { generateUniqueProductSlug } from "@/app/lib/products-db";
import { ensureProductDir } from "@/app/lib/product-images";
import { revalidatePublicProductPages } from "@/app/lib/revalidate-products";

interface ImportItem {
  sku: string;
  name: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}
interface UpdateItem extends ImportItem { id: number; }

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { newItems?: ImportItem[]; updateIds?: UpdateItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const newItems = body.newItems ?? [];
  const updateIds = body.updateIds ?? [];
  const now = new Date().toISOString();
  const errors: string[] = [];
  let added = 0, updated = 0;

  // Подтягиваем карту slug → categoryId.
  const cats = db.select().from(schema.categories).all();
  const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

  for (const item of newItems) {
    const sku = item.sku.trim();
    const name = item.name.trim();
    const brand = item.brand.trim();
    const price = Number(item.price);
    if (!sku || !name || !Number.isFinite(price) || price < 0) {
      errors.push(`Пропущено: некорректные данные для "${item.sku}"`);
      continue;
    }
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    try {
      const externalId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const slug = generateUniqueProductSlug({ name, brand, sku });
      db.insert(schema.products).values({
        externalId, slug, sku, name, brand,
        price: Math.round(price),
        inStock: 1,
        car: item.car,
        categoryId,
        createdAt: now,
        updatedAt: now,
      }).run();
      ensureProductDir(sku);
      added++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE constraint failed: products\.sku/i.test(msg))
        errors.push(`Артикул "${sku}" уже существует — пропущено`);
      else errors.push(`Ошибка добавления ${sku}: ${msg}`);
    }
  }

  for (const item of updateIds) {
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    try {
      db.update(schema.products).set({
        name: item.name, brand: item.brand, price: item.price,
        car: item.car, categoryId, updatedAt: now,
      }).where(eq(schema.products.id, item.id)).run();
      updated++;
    } catch (e) {
      errors.push(`Ошибка обновления id=${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (added > 0 || updated > 0) {
    revalidatePublicProductPages();
  }

  return NextResponse.json({ added, updated, errors });
}
