import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

interface ImportItem {
  name: string;
  sku: string;
  brand: string;
  price: number;
}

interface UpdateItem extends ImportItem {
  id: number;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { newItems?: ImportItem[]; updateIds?: UpdateItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Неверный формат данных" },
      { status: 400 }
    );
  }

  const newItems = body.newItems ?? [];
  const updateIds = body.updateIds ?? [];
  const now = new Date().toISOString();
  const errors: string[] = [];
  let added = 0;
  let updated = 0;

  // Insert new products
  for (const item of newItems) {
    try {
      const externalId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.insert(schema.products)
        .values({
          externalId,
          sku: item.sku,
          name: item.name,
          brand: item.brand,
          price: item.price,
          inStock: 1,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      added++;
    } catch (e) {
      errors.push(`Ошибка добавления ${item.sku}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Update existing products
  for (const item of updateIds) {
    try {
      db.update(schema.products)
        .set({
          name: item.name,
          brand: item.brand,
          price: item.price,
          updatedAt: now,
        })
        .where(eq(schema.products.id, item.id))
        .run();
      updated++;
    } catch (e) {
      errors.push(`Ошибка обновления id=${item.id} (${item.sku}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ added, updated, errors });
}
