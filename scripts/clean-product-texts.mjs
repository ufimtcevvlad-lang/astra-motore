#!/usr/bin/env node
/**
 * Чистит названия и сохранённые описания товаров от дублей артикула:
 *   "Товар | арт. ABC | арт. ABC" -> "Товар"
 *
 * Запуск:
 *   node scripts/clean-product-texts.mjs --dry-run
 *   node scripts/clean-product-texts.mjs --apply
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DB_PATH = process.env.SHOP_DB_PATH || path.join(ROOT, "data", "shop.db");
const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanupSpaces(value) {
  return value
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([;:])(?=\S)/g, "$1 ")
    .replace(/,(?=\S)(?!\d)/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\|+\s*$/g, "")
    .replace(/^\s*[|,;—-]\s*/g, "")
    .trim();
}

function stripSkuMentions(value, sku) {
  if (!value || !sku) return value ?? "";
  const escapedSku = escapeRe(sku);
  const artPattern = new RegExp(
    String.raw`(?:\s*[|,;—-]\s*)?(?:арт\.?|артикул)\s*[:№#-]?\s*${escapedSku}`,
    "gi",
  );
  return cleanupSpaces(value.replace(artPattern, ""));
}

function collapseRepeatedSkuTail(name, sku) {
  const stripped = stripSkuMentions(name, sku);
  return stripped || name.trim();
}

function cleanDescription(description, sku) {
  if (!description) return "";
  let next = stripSkuMentions(description, sku);

  // Если после удаления "Артикул XXX" остались пустые фразы с точками.
  next = next
    .replace(/\s*Артикул в карточке совпадает с маркировкой на пакете\.?/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s*[—-]\s*\./g, ".")
    .replace(/\.\s*\./g, ".")
    .replace(/^\.\s*/g, "")
    .replace(/\s+\./g, ".")
    .trim();

  return cleanupSpaces(next);
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Не нашёл БД: ${DB_PATH}`);
    process.exit(1);
  }

  if (APPLY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${DB_PATH}.backup-clean-product-texts-${stamp}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Бэкап БД: ${backupPath}`);
  }

  const db = new Database(DB_PATH, DRY_RUN ? { readonly: true, fileMustExist: true } : { fileMustExist: true });
  const rows = db.prepare("SELECT id, sku, name, description FROM products").all();
  const changes = [];

  for (const row of rows) {
    const name = String(row.name ?? "");
    const description = String(row.description ?? "");
    const cleanName = collapseRepeatedSkuTail(name, row.sku);
    const cleanDesc = cleanDescription(description, row.sku);

    if (cleanName !== name || cleanDesc !== description) {
      changes.push({
        id: row.id,
        sku: row.sku,
        name,
        cleanName,
        description,
        cleanDesc,
      });
    }
  }

  console.log(`Режим: ${DRY_RUN ? "dry-run" : "apply"}`);
  console.log(`Товаров проверено: ${rows.length}`);
  console.log(`Будет изменено: ${changes.length}`);

  for (const item of changes.slice(0, 40)) {
    console.log(`\n#${item.id} ${item.sku}`);
    if (item.name !== item.cleanName) {
      console.log(`name: ${item.name}`);
      console.log(`  ->  ${item.cleanName}`);
    }
    if (item.description !== item.cleanDesc) {
      console.log(`description: ${item.description}`);
      console.log(`  ->  ${item.cleanDesc}`);
    }
  }
  if (changes.length > 40) {
    console.log(`\n...и ещё ${changes.length - 40} товаров`);
  }

  if (APPLY && changes.length > 0) {
    const stmt = db.prepare("UPDATE products SET name = ?, description = ?, updated_at = ? WHERE id = ?");
    const now = new Date().toISOString();
    const tx = db.transaction((items) => {
      for (const item of items) stmt.run(item.cleanName, item.cleanDesc, now, item.id);
    });
    tx(changes);
    console.log(`\nГотово: обновлено ${changes.length} товаров.`);
  }

  db.close();
}

main();
