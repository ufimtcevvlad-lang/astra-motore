/**
 * Нормализация названий брендов: единый регистр, мёрдж дубликатов.
 * Запуск: npx tsx scripts/normalize-brands.ts
 */
import { db, schema } from "../src/app/lib/db";
import { eq } from "drizzle-orm";
import { canonicalizeBrand } from "../src/app/lib/brand-normalize";

const rows = db.select().from(schema.products).all();
let updated = 0;
const distinct = new Map<string, number>();
for (const r of rows) {
  const canonical = canonicalizeBrand(r.brand);
  distinct.set(canonical, (distinct.get(canonical) ?? 0) + 1);
  if (canonical !== r.brand) {
    db.update(schema.products).set({ brand: canonical, updatedAt: new Date().toISOString() })
      .where(eq(schema.products.id, r.id)).run();
    updated += 1;
  }
}
console.log(`Updated ${updated} of ${rows.length} products`);
console.log("Distinct brands after normalization:");
for (const [b, n] of [...distinct.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${b || "(empty)"}: ${n}`);
}
