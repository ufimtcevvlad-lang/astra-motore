/**
 * Применяет data/photo-manifest.json к БД shop.db.
 *
 * Манифест — накопительный git-tracked JSON: { [sku]: { image, images } }.
 * Цель: боевая БД на VPS синхронизируется с локальным импортом фото.
 *
 * Идемпотентно: UPDATE только если поле отличается.
 *
 * Запуск: npx tsx scripts/apply-photo-manifest.ts
 */
import { db, schema } from "../src/app/lib/db";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

const MANIFEST_PATH = path.join(process.cwd(), "data", "photo-manifest.json");

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log(`Манифеста нет (${MANIFEST_PATH}) — пропускаю.`);
  process.exit(0);
}

type Entry = { image: string; images: string[] };
const manifest: Record<string, Entry> = JSON.parse(
  fs.readFileSync(MANIFEST_PATH, "utf8"),
);
const entries = Object.entries(manifest);
console.log(`Манифест: ${entries.length} SKU`);

const now = new Date().toISOString();
let updated = 0;
let notFound = 0;
let unchanged = 0;

for (const [sku, entry] of entries) {
  const rows = db
    .select()
    .from(schema.products)
    .where(eq(schema.products.sku, sku))
    .all();
  if (rows.length === 0) {
    notFound += 1;
    continue;
  }
  for (const r of rows) {
    const nextImages = JSON.stringify(entry.images);
    if (r.image === entry.image && r.images === nextImages) {
      unchanged += 1;
      continue;
    }
    db.update(schema.products)
      .set({ image: entry.image, images: nextImages, updatedAt: now })
      .where(eq(schema.products.id, r.id))
      .run();
    updated += 1;
  }
}

console.log(
  `Обновлено: ${updated}, без изменений: ${unchanged}, SKU не найдено: ${notFound}`,
);
