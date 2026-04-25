/**
 * Ищет товары с гомоглифами: в одном слове перемешаны кириллица и латиница.
 *
 * Зачем: 1С иногда отдаёт артикулы вроде «ЕСС-001» (кириллические Е+С+С),
 * которые на экране неотличимы от латинского «ECC-001». Поиск по сайту
 * ломается: пользователь вводит латиницу — товар не находится. Safari в
 * админке такие случаи подсвечивает и предлагает конвертацию, но это
 * заметно только при ручном редактировании поштучно.
 *
 * Скрипт пробегает sku/brand/name всех товаров и печатает строки, в
 * которых хотя бы одно «слово» (последовательность букв/цифр) содержит
 * и кириллицу, и латиницу одновременно.
 *
 * Запуск: npx tsx scripts/find-mixed-script-products.ts
 *   --fix         — заменить кириллические гомоглифы на латиницу в БД
 *                   (по умолчанию — dry-run, только печать).
 *   --field=sku   — проверять только это поле (sku|brand|name|all). Default: all.
 */
import Database from "better-sqlite3";
import path from "path";

const args = new Set(process.argv.slice(2));
const apply = args.has("--fix");
const fieldArg =
  process.argv.find((a) => a.startsWith("--field="))?.split("=")[1] ?? "all";
const dbArg =
  process.argv.find((a) => a.startsWith("--db="))?.split("=")[1] ??
  path.join(process.cwd(), "data", "shop.db");

const FIELDS: ("sku" | "brand" | "name")[] =
  fieldArg === "all" ? ["sku", "brand", "name"] : [fieldArg as "sku" | "brand" | "name"];

const CYR = /[А-Яа-яЁё]/;
const LAT = /[A-Za-z]/;

// Кириллические гомоглифы → латинские. Только однозначные пары.
// Источник: Unicode Confusables. Намеренно не включаем «н» (≠ "n"
// визуально на большинстве шрифтов) и т.п. — берём только реально
// неразличимые.
const HOMOGLYPH: Record<string, string> = {
  А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M",
  О: "O", Р: "P", Т: "T", Х: "X", У: "Y",
  а: "a", в: "b", с: "c", е: "e", о: "o", р: "p", х: "x", у: "y",
  // А ещё буквы которые латиницы не имеют, но визуально путаются:
  // их не трогаем, потому что нет однозначной замены.
};

function hasMixedScriptWord(s: string): boolean {
  // Разбиваем на «слова» по любым нелитерным разделителям.
  for (const word of s.split(/[^A-Za-zА-Яа-яЁё0-9]+/)) {
    if (!word) continue;
    if (CYR.test(word) && LAT.test(word)) return true;
  }
  return false;
}

function fixWord(word: string): string {
  // Только если в слове есть и латиница, и кириллица. Иначе чистая
  // кириллица (нормальное русское слово) не должна транслитерироваться.
  if (!(CYR.test(word) && LAT.test(word))) return word;
  let out = "";
  for (const ch of word) {
    out += HOMOGLYPH[ch] ?? ch;
  }
  return out;
}

function fixString(s: string): string {
  return s.replace(/[A-Za-zА-Яа-яЁё0-9]+/g, fixWord);
}

const sqlite = new Database(dbArg, { readonly: !apply });
console.log(`БД: ${dbArg}\n`);
const rows = sqlite
  .prepare("SELECT id, sku, brand, name FROM products")
  .all() as { id: number; sku: string; brand: string; name: string }[];

type Hit = { id: number; sku: string; field: string; before: string; after: string };
const hits: Hit[] = [];

for (const r of rows) {
  for (const field of FIELDS) {
    const value = (r as Record<string, unknown>)[field];
    if (typeof value !== "string" || !value) continue;
    if (!hasMixedScriptWord(value)) continue;
    hits.push({
      id: r.id,
      sku: r.sku,
      field,
      before: value,
      after: fixString(value),
    });
  }
}

if (hits.length === 0) {
  console.log("Гомоглифов не найдено. Чисто.");
  process.exit(0);
}

console.log(`Найдено ${hits.length} полей с mixed-script:\n`);
for (const h of hits) {
  console.log(`  id=${h.id} sku=${h.sku} field=${h.field}`);
  console.log(`    было:  ${h.before}`);
  console.log(`    стало: ${h.after}`);
  console.log();
}

if (!apply) {
  console.log("Dry-run. Перезапусти с --fix чтобы записать в БД.");
  process.exit(0);
}

let updated = 0;
const now = new Date().toISOString();
// Именованные параметры (@value/@now/@id) — better-sqlite3 принимает один
// объект, и тогда TS-типизация не упирается в variadic-сигнатуру .run().
const updateStmts = {
  sku: sqlite.prepare(
    "UPDATE products SET sku = @value, updated_at = @now WHERE id = @id",
  ),
  brand: sqlite.prepare(
    "UPDATE products SET brand = @value, updated_at = @now WHERE id = @id",
  ),
  name: sqlite.prepare(
    "UPDATE products SET name = @value, updated_at = @now WHERE id = @id",
  ),
};
for (const h of hits) {
  if (h.before === h.after) continue;
  updateStmts[h.field as "sku" | "brand" | "name"].run({
    value: h.after,
    now,
    id: h.id,
  });
  updated++;
}
console.log(`Обновлено ${updated} полей.`);
