import { eq } from "drizzle-orm";
import { db, schema } from "../src/app/lib/db";
import { products as staticProducts } from "../src/app/data/products";
import { baseProductSlug } from "../src/app/lib/product-slug";
import { ensureProductDir } from "../src/app/lib/product-images";

function main() {
  const now = new Date().toISOString();
  const cats = db.select().from(schema.categories).all();
  const catSlugToId = new Map(cats.map((c) => [c.slug, c.id]));

  const sorted = [...staticProducts].sort((a, b) => a.id.localeCompare(b.id, "en"));

  const existingRows = db.select().from(schema.products).all();
  const bySku = new Map(existingRows.map((r) => [r.sku, r]));
  const byExternalId = new Map(existingRows.map((r) => [r.externalId, r]));

  const staticExternalIds = new Set(sorted.map((p) => `static-${p.id}`));
  const takenSlugs = new Set<string>();
  for (const r of existingRows) {
    if (r.slug && !staticExternalIds.has(r.externalId) && !bySku.has(r.sku)) {
      takenSlugs.add(r.slug);
    }
  }

  const slugs = new Map<string, string>();
  for (const p of sorted) {
    const base = baseProductSlug(p);
    let s = base;
    if (takenSlugs.has(s)) s = `${base}-${p.id}`;
    let n = 2;
    while (takenSlugs.has(s)) {
      s = `${base}-${p.id}-${n}`;
      n += 1;
    }
    takenSlugs.add(s);
    slugs.set(`static-${p.id}`, s);
  }

  let inserted = 0;
  let updated = 0;

  for (const p of sorted) {
    const externalId = `static-${p.id}`;
    const slug = slugs.get(externalId)!;
    const categoryId = p.category ? catSlugToId.get(p.category) ?? null : null;

    const existing = byExternalId.get(externalId) ?? bySku.get(p.sku);

    if (existing) {
      db.update(schema.products)
        .set({
          externalId,
          slug,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          country: p.country,
          categoryId,
          car: p.car,
          price: p.price,
          inStock: p.inStock,
          description: p.description,
          longDescription: p.longDescription ? JSON.stringify(p.longDescription) : null,
          updatedAt: now,
        })
        .where(eq(schema.products.id, existing.id))
        .run();
      updated += 1;
    } else {
      db.insert(schema.products)
        .values({
          externalId,
          slug,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          country: p.country,
          categoryId,
          car: p.car,
          price: p.price,
          inStock: p.inStock,
          image: "",
          images: "[]",
          description: p.description,
          longDescription: p.longDescription ? JSON.stringify(p.longDescription) : null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      inserted += 1;
    }

    ensureProductDir(p.sku);
  }

  console.log(`Seed done. inserted=${inserted}, updated=${updated}`);
}

main();
