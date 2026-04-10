#!/usr/bin/env node
/**
 * Импорт товаров из Excel-выгрузки 1С в products.ts.
 *
 * Запуск:
 *   node scripts/import-products-excel.mjs ~/Desktop/файл.xlsx --dry-run
 *   node scripts/import-products-excel.mjs ~/Desktop/файл.xlsx --apply
 *
 * Excel формат (без заголовка или с заголовком — определяется автоматически):
 *   Колонка A: Наименование
 *   Колонка B: Артикул
 *   Колонка C: Цена (₽)
 *
 * Автоматически:
 *   - Определяет бренд из названия (GATES, PATRON, Bosch, Elring...)
 *   - Подставляет марку авто: Corsa → Opel Corsa, Cruze → Chevrolet Cruze
 *   - Добавляет « | арт. XXX» в конце названия
 *   - Определяет категорию из названия (Охлаждение, Двигатель, Подвеска...)
 *   - Определяет модель авто для поля car
 *   - Проверяет дубли по артикулу (пропускает уже существующие)
 *   - Проверяет дубли внутри файла (пропускает повторы)
 *   - Присваивает ID (opel-N) автоинкрементом от максимального
 *   - Фото: _pending.jpg (до загрузки через парсер)
 *   - qty: 10 (по умолчанию)
 */

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PRODUCTS_TS = path.join(ROOT, "src/app/data/products.ts");

// ==================== НАСТРОЙКИ ====================

const DEFAULT_QTY = 10;
const DEFAULT_COUNTRY = "Уточняется";

// ==================== ОПРЕДЕЛЕНИЕ БРЕНДА ====================

const BRAND_PATTERNS = [
  [/\bGATES\b/i, "Gates"],
  [/\bPATRON\b/i, "Patron"],
  [/\bVIKA\b/i, "VIKA"],
  [/\bQUATTRO\s*FRENI\b/i, "Quattro Freni"],
  [/\bSASIC\b/i, "Sasic"],
  [/\bBOSCH\b/i, "Bosch"],
  [/\bELRING\b/i, "Elring"],
  [/\bHENGST\b/i, "Hengst"],
  [/\bFILTRON\b/i, "Filtron"],
  [/\bMANN\b/i, "Mann"],
  [/\bDELPHI\b/i, "Delphi"],
  [/\bINA\b/i, "INA"],
  [/\bNGK\b/i, "NGK"],
  [/\bDENSO\b/i, "Denso"],
  [/\bMAHLE\b/i, "Mahle"],
  [/\bFEBI\b/i, "Febi Bilstein"],
  [/\bLEMF[OÖ]RDER\b/i, "Lemforder"],
  [/\bTRW\b/i, "TRW"],
  [/\bSKF\b/i, "SKF"],
  [/\bSIBTEK\b/i, "Sibtek"],
  [/\bSTELLOX\b/i, "Stellox"],
  [/\bACDELCO\b/i, "ACDelco"],
  [/\bPIERBURG\b/i, "Pierburg"],
  [/\bMOPAR\b/i, "Mopar"],
  [/\bCHAMPION\b/i, "Champion"],
  [/\bKOLBENSCHMIDT\b/i, "Kolbenschmidt"],
];

function detectBrand(name) {
  for (const [pattern, brand] of BRAND_PATTERNS) {
    if (pattern.test(name)) return brand;
  }
  return "—";
}

// ==================== ОПРЕДЕЛЕНИЕ КАТЕГОРИИ ====================

const CATEGORY_PATTERNS = [
  [/патрубок|шланг|трубк|бачок|термостат|помп|радиатор|крышк.*бачк|тройник.*охлажд|антифриз/i, "Охлаждение"],
  [/свеч|зажиган|катушк|модуль зажиган/i, "Свечи и зажигание"],
  [/фильтр.*масл|масл.*фильтр/i, "Масляные фильтры"],
  [/фильтр.*воздуш|воздуш.*фильтр/i, "Воздушные фильтры"],
  [/фильтр.*салон|салон.*фильтр/i, "Салонные фильтры"],
  [/прокладк|сальник|кольц.*уплотн|уплотнит/i, "Прокладки, сальники и кольца"],
  [/сайлентблок|стойк.*стабил|тяга.*стабил|опор.*стойк|рычаг|подвеск|втулк.*рулев/i, "Подвеска"],
  [/ремень|шестерн|клапан.*распред|толкатель|вкладыш|кольц.*поршн|насос.*топлив|крышк.*клапан|форсунк/i, "Двигатель"],
  [/ламп|свет|электри/i, "Автосвет и электрика"],
];

function detectCategory(name) {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return "Охлаждение"; // fallback
}

// ==================== ПОДСТАНОВКА МАРКИ АВТО ====================

const CAR_MODEL_PATTERNS = [
  [/\bCorsa[\s-]?D\b/i, "Opel Corsa D"],
  [/\bCorsa[\s-]?C\b/i, "Opel Corsa C"],
  [/\bCorsa\b/i, "Opel Corsa"],
  [/\bAstra[\s-]?H\b/i, "Opel Astra H"],
  [/\bAstra[\s-]?J\b/i, "Opel Astra J"],
  [/\bAstra[\s-]?G\b/i, "Opel Astra G"],
  [/\bZafira[\s-]?B\b/i, "Opel Zafira B"],
  [/\bZafira[\s-]?A\b/i, "Opel Zafira A"],
  [/\bVectra[\s-]?C\b/i, "Opel Vectra C"],
  [/\bInsignia\b/i, "Opel Insignia"],
  [/\bMokka\b/i, "Opel Mokka"],
  [/\bMeriva\b/i, "Opel Meriva"],
  [/\bCruze\b/i, "Chevrolet Cruze"],
  [/\bOrlando\b/i, "Chevrolet Orlando"],
  [/\bAveo[\s-]?T300\b/i, "Chevrolet Aveo T300"],
  [/\bAveo\b/i, "Chevrolet Aveo"],
  [/\bCaptiva\b/i, "Chevrolet Captiva"],
  [/\bCobalt\b/i, "Chevrolet Cobalt"],
];

function detectCar(name) {
  const found = [];
  const used = new Set();
  for (const [pattern, car] of CAR_MODEL_PATTERNS) {
    if (pattern.test(name) && !used.has(car)) {
      found.push(car);
      used.add(car);
    }
  }
  if (found.length === 0) return "Opel / Chevrolet — уточняйте применение по VIN";
  return found.join(", ") + " — уточняйте по VIN";
}

/** Добавляет марку перед моделью в названии. */
function enrichName(name, sku) {
  let result = name;
  // Подставляем марку только если её ещё нет
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Corsa/g, "Opel Corsa");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Astra/g, "Opel Astra");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Zafira/g, "Opel Zafira");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Vectra/g, "Opel Vectra");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Mokka/g, "Opel Mokka");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Insignia/g, "Opel Insignia");
  result = result.replace(/(?<!\bOpel\s)(?<!\bOpel-)(?<!\/)Meriva/g, "Opel Meriva");
  result = result.replace(/(?<!\bChevrolet\s)(?<!\/)Cruze/g, "Chevrolet Cruze");
  result = result.replace(/(?<!\bChevrolet\s)(?<!\/)Orlando/g, "Chevrolet Orlando");
  result = result.replace(/(?<!\bChevrolet\s)(?<!\/)Aveo/g, "Chevrolet Aveo");
  result = result.replace(/(?<!\bChevrolet\s)(?<!\/)Captiva/g, "Chevrolet Captiva");
  result = result.replace(/(?<!\bChevrolet\s)(?<!\/)Cobalt/g, "Chevrolet Cobalt");

  // Добавляем артикул в конец если ещё нет
  if (!result.includes("| арт.")) {
    result = `${result} | арт. ${sku}`;
  }

  return result;
}

// ==================== MAIN ====================

function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((a) => !a.startsWith("--"));
  const apply = args.includes("--apply");

  if (!filePath) {
    console.log("Использование:");
    console.log("  node scripts/import-products-excel.mjs ~/Desktop/файл.xlsx --dry-run");
    console.log("  node scripts/import-products-excel.mjs ~/Desktop/файл.xlsx --apply");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Файл не найден: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n📦 Импорт товаров из Excel`);
  console.log(`   Файл: ${filePath}`);
  console.log(`   Режим: ${apply ? "APPLY" : "DRY-RUN"}\n`);

  // Читаем Excel
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Определяем есть ли заголовок
  const firstRow = rows[0] || [];
  const hasHeader =
    typeof firstRow[0] === "string" &&
    (firstRow[0].toLowerCase().includes("наименование") ||
      firstRow[0].toLowerCase().includes("название") ||
      firstRow[0] === "№");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Парсим товары
  const items = dataRows
    .filter((r) => r[0] && r[1] && String(r[1]).trim())
    .map((r) => {
      // Если первая колонка — номер (число), то сдвигаем на 1
      const offset = typeof r[0] === "number" && typeof r[1] === "string" && r[2] ? 1 : 0;
      return {
        name: String(r[offset]).trim(),
        sku: String(r[offset + 1]).trim(),
        price: Number(r[offset + 2]) || 0,
      };
    })
    .filter((i) => i.sku && i.name);

  console.log(`Прочитано строк: ${items.length}\n`);

  // Читаем существующие SKU
  const ts = fs.readFileSync(PRODUCTS_TS, "utf8");
  const existingSkus = new Set();
  let maxId = 0;
  for (const m of ts.matchAll(/sku:\s*"([^"]+)"/g)) existingSkus.add(m[1]);
  for (const m of ts.matchAll(/id:\s*"opel-(\d+)"/g)) {
    const n = parseInt(m[1], 10);
    if (n > maxId) maxId = n;
  }

  // Фильтруем дубли
  const seenSkus = new Set();
  const dupes = [];
  const internalDupes = [];
  const fresh = [];

  for (const item of items) {
    if (existingSkus.has(item.sku)) {
      dupes.push(item);
    } else if (seenSkus.has(item.sku)) {
      internalDupes.push(item);
    } else {
      seenSkus.add(item.sku);
      fresh.push(item);
    }
  }

  // Отчёт
  console.log(`✅ Новых товаров: ${fresh.length}`);
  console.log(`⏭  Дубли (уже на сайте): ${dupes.length}`);
  if (internalDupes.length > 0)
    console.log(`⏭  Дубли внутри файла: ${internalDupes.length}`);
  console.log(`📊 На сайте сейчас: ${existingSkus.size} товаров\n`);

  if (dupes.length > 0) {
    console.log("Пропущенные дубли:");
    for (const d of dupes) console.log(`   ${d.sku}  ${d.name.slice(0, 50)}`);
    console.log();
  }

  if (fresh.length === 0) {
    console.log("Нечего добавлять — все товары уже на сайте.");
    return;
  }

  // Формируем блоки
  let nextId = maxId + 1;
  const blocks = [];

  console.log("Будут добавлены:");
  for (const item of fresh) {
    const id = `opel-${nextId}`;
    const brand = detectBrand(item.name);
    const category = detectCategory(item.name);
    const car = detectCar(item.name);
    const seoName = enrichName(item.name, item.sku);

    console.log(`   ${id}  ${item.sku.padEnd(14)}  ${brand.padEnd(16)}  ${category.padEnd(24)}  ${seoName.slice(0, 55)}`);

    blocks.push(`  {
    id: "${id}",
    name: "${seoName.replace(/"/g, '\\"')}",
    sku: "${item.sku}",
    qty: ${DEFAULT_QTY},
    priceRaw: ${item.price},
    brand: "${brand}",
    country: "${DEFAULT_COUNTRY}",
    category: "${category}",
    car: "${car}",
    image: "/images/catalog/_pending.jpg",
    description:
      "Артикул ${item.sku}. Перед заказом сверяйте совместимость по VIN.",
  }`);

    nextId++;
  }

  console.log(`\nID: opel-${maxId + 1} ... opel-${nextId - 1}`);
  console.log(`Итого на сайте будет: ${existingSkus.size + fresh.length} товаров\n`);

  if (!apply) {
    console.log("Это DRY-RUN. Чтобы применить:");
    console.log(`   node scripts/import-products-excel.mjs "${filePath}" --apply\n`);
    return;
  }

  // Вставляем в products.ts
  const insertPoint = ts.lastIndexOf("];");
  if (insertPoint === -1) {
    console.error("Не нашёл ]; в products.ts");
    process.exit(1);
  }

  const newTs =
    ts.slice(0, insertPoint) + blocks.join(",\n") + ",\n" + ts.slice(insertPoint);
  fs.writeFileSync(PRODUCTS_TS, newTs);

  console.log(`✅ products.ts обновлён. Добавлено ${fresh.length} товаров.`);
  console.log("   Проверь: npm run typecheck && git diff src/app/data/products.ts\n");
}

main();
