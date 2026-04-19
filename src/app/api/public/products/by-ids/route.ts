import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db, schema } from "../../../../lib/db";
import { rowToProduct } from "../../../../lib/products-db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ items: [] });
  const rows = db
    .select()
    .from(schema.products)
    .where(inArray(schema.products.externalId, ids))
    .all();
  const cats = db.select().from(schema.categories).all();
  const catMap = new Map(cats.map((c) => [c.id, c.title]));
  const items = rows.map((r) =>
    rowToProduct(r, r.categoryId != null ? catMap.get(r.categoryId) ?? null : null),
  );
  return NextResponse.json({ items });
}
