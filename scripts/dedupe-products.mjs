#!/usr/bin/env node
/**
 * Удаляет дубли карточек товаров, у которых SKU отличается только
 * разделителями (`GB6116` ↔ `GB-6116`, `PE9821` ↔ `PE982/1`).
 *
 * Канонический выбор:
 *  1. SKU с разделителем (как пишет производитель) — приоритет.
 *  2. При прочих равных — карточка с реальным `image` (не `_pending`).
 *  3. Если оба варианта одинаковы — оставляем меньший id (старший).
 *
 * Безопасность:
 *  - Создаём бэкап БД рядом как shop.db.backup-YYYY-MM-DDTHH-MM-SS.
 *  - Перед удалением переносим непустые product_specs / analogs / views
 *    с дубля на канонический. Если на каноническом уже есть — оставляем
 *    его и сбрасываем дублирующее.
 *  - Удаление товара cascade-чистит specs/analogs/views (FK ON DELETE).
 *  - Заказы (orders.items — JSON snapshot) не трогаются.
 *
 * Запуск:
 *   node scripts/dedupe-products.mjs --dry-run     # показать план
 *   node scripts/dedupe-products.mjs --apply       # применить локально
 *   node scripts/dedupe-products.mjs --apply --db /path/to/prod/shop.db
 */
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DEFAULT_DB = path.join(ROOT, "data", "shop.db");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const dbIdx = args.indexOf("--db");
const DB_PATH = dbIdx >= 0 ? args[dbIdx + 1] : DEFAULT_DB;

const RESET = "\x1b[0m";
const colorize = (s, c) => `\x1b[${{red:31,green:32,yellow:33,cyan:36,gray:90}[c]}m${s}${RESET}`;

function normCompact(s) {
  return String(s || "").replace(/[\s\-_./]+/g, "").toUpperCase();
}

function hasDelimiter(sku) {
  return /[\s\-_./]/.test(sku);
}

function pickCanonical(group) {
  // 1. Тот, у кого разделитель в sku — каноничный (производитель так пишет).
  const withDelim = group.filter((p) => hasDelimiter(p.sku));
  const candidates = withDelim.length === 1 ? withDelim
                   : withDelim.length > 1 ? withDelim
                   : group;
  // 2. Среди оставшихся — у кого `image` без `_pending`.
  const withRealImage = candidates.filter((p) => p.image && !p.image.includes("_pending"));
  const final = withRealImage.length > 0 ? withRealImage : candidates;
  // 3. Минимальный id.
  return final.sort((a, b) => a.id - b.id)[0];
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Нет БД: ${DB_PATH}`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  const products = db.prepare("SELECT id, sku, slug, image, images, price, hidden FROM products").all();
  console.log(`Прочитано: ${products.length} товаров`);

  // Группировка по нормализованному SKU.
  const groups = new Map();
  for (const p of products) {
    const k = normCompact(p.sku);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }

  const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
  console.log(`Групп-дубликатов: ${dupGroups.length}`);
  if (dupGroups.length === 0) {
    db.close();
    return;
  }

  const plan = []; // { keep, drop[] }
  for (const [norm, group] of dupGroups) {
    const keep = pickCanonical(group);
    const drop = group.filter((p) => p.id !== keep.id);
    plan.push({ norm, keep, drop });
  }

  console.log("\nПлан удаления:");
  for (const { norm, keep, drop } of plan) {
    console.log(`\n  ${colorize(norm, "cyan")}`);
    console.log(`    оставляем: id=${keep.id} sku=${keep.sku} price=${keep.price}₽`);
    for (const d of drop) {
      console.log(`    удаляем:   id=${d.id} sku=${d.sku} price=${d.price}₽`);
    }
  }

  if (!APPLY) {
    console.log(colorize("\n[dry-run] Запусти с --apply чтобы применить.", "yellow"));
    db.close();
    return;
  }

  // Бэкап.
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = `${DB_PATH}.backup-${ts}`;
  fs.copyFileSync(DB_PATH, backup);
  console.log(`\nБэкап: ${backup}`);

  let deleted = 0;
  let migrated = { specs: 0, analogs: 0, views: 0 };

  // Имена колонок берём из реальной схемы:
  //  product_specs:  product_id, label, value, sort_order
  //  product_analogs: product_id, analog_id  (без sort_order)
  //  product_views:  product_id, date, view_count (а не индивидуальные
  //                   просмотры с timestamp; для одной даты суммируем).
  const migrateSpecs = db.prepare(
    `INSERT INTO product_specs (product_id, label, value, sort_order)
     SELECT ?, label, value, sort_order FROM product_specs WHERE product_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM product_specs s2 WHERE s2.product_id = ? AND s2.label = product_specs.label
       )`
  );
  const migrateAnalogs = db.prepare(
    `INSERT INTO product_analogs (product_id, analog_id)
     SELECT ?, analog_id FROM product_analogs WHERE product_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM product_analogs a2 WHERE a2.product_id = ? AND a2.analog_id = product_analogs.analog_id
       )`
  );
  const mergeViewsExisting = db.prepare(
    `UPDATE product_views SET view_count = view_count + (
       SELECT COALESCE(SUM(view_count), 0) FROM product_views v2
        WHERE v2.product_id = ? AND v2.date = product_views.date
     )
     WHERE product_id = ? AND date IN (
       SELECT date FROM product_views WHERE product_id = ?
     )`
  );
  const insertViewsMissing = db.prepare(
    `INSERT INTO product_views (product_id, date, view_count)
     SELECT ?, date, view_count FROM product_views v
      WHERE v.product_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM product_views v2 WHERE v2.product_id = ? AND v2.date = v.date
        )`
  );
  const delProduct = db.prepare("DELETE FROM products WHERE id = ?");

  const tx = db.transaction(() => {
    for (const { keep, drop } of plan) {
      for (const d of drop) {
        const r1 = migrateSpecs.run(keep.id, d.id, keep.id);
        const r2 = migrateAnalogs.run(keep.id, d.id, keep.id);
        // views: сначала суммируем счётчики для дат, где у keep уже
        // есть запись; потом переносим даты, которых у keep ещё нет.
        const r3a = mergeViewsExisting.run(d.id, keep.id, d.id);
        const r3b = insertViewsMissing.run(keep.id, d.id, keep.id);
        migrated.specs += r1.changes;
        migrated.analogs += r2.changes;
        migrated.views += r3a.changes + r3b.changes;
        delProduct.run(d.id);
        deleted++;
      }
    }
  });
  tx();

  console.log(colorize(`\n✅ Удалено карточек: ${deleted}`, "green"));
  console.log(`   перенесено specs: ${migrated.specs}, analogs: ${migrated.analogs}, views: ${migrated.views}`);
  db.close();
}

main();
