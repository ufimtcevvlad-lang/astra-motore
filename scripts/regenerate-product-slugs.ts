/**
 * Перегенерация «человеческих» slug для всех товаров.
 * Товары, у которых slug совпадает с sku (backfill из миграции 0004),
 * получают новый slug из имени/бренда/артикула.
 * Запуск: npx tsx scripts/regenerate-product-slugs.ts
 */
import { db, schema } from "../src/app/lib/db";
import { baseProductSlug } from "../src/app/lib/product-slug";
import { eq } from "drizzle-orm";

const rows = db.select().from(schema.products).all();
const taken = new Set(rows.filter((r) => r.slug && r.slug !== r.sku).map((r) => r.slug));

let updated = 0;
for (const r of rows) {
  if (r.slug && r.slug !== r.sku) continue;
  const base = baseProductSlug({ name: r.name, brand: r.brand, sku: r.sku });
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  taken.add(candidate);
  db.update(schema.products).set({ slug: candidate }).where(eq(schema.products.id, r.id)).run();
  updated += 1;
}
console.log(`Updated ${updated} of ${rows.length} products`);
