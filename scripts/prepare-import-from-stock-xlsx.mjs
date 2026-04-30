#!/usr/bin/env node
/**
 * Готовит Excel для админского импорта товаров из выгрузки остатков 1С.
 *
 * Вход:
 *   --stock "/path/остатки.xlsx"
 *   --skus  "/path/articles.txt"  (по одному артикулу в строке)
 *   --out   "/path/import.xlsx"
 *
 * Поиск артикула нормализованный: убираем пробелы, точки, тире, слэши,
 * подчёркивания и сравниваем в верхнем регистре.
 *
 * Выход:
 *   Лист "Товары" — формат сайта: C=Наименование, D=Артикул, E=Бренд, F=Цена.
 *   Лист "Не найдено" — артикулы, которых нет в выгрузке 1С.
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? "";
}

function normSku(value) {
  return String(value ?? "")
    .replace(/[\s\-_.\/\\]+/g, "")
    .toUpperCase();
}

function readSkuList(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asPrice(value) {
  if (typeof value === "number") return Math.round(value);
  const parsed = Number(String(value ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function loadStockRows(stockPath) {
  const wb = XLSX.readFile(stockPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const bySku = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[0] ?? "").trim();
    const sku = String(row[5] ?? "").trim();
    const brand = String(row[6] ?? "").trim();
    const price = asPrice(row[7]);
    if (!name || !sku || price <= 0) continue;

    const key = normSku(sku);
    if (!key) continue;
    if (!bySku.has(key)) {
      bySku.set(key, []);
    }
    bySku.get(key).push({ rowNumber: i + 1, name, sku, brand, price });
  }

  return bySku;
}

function makeWorkbook(matches, missing) {
  const importRows = [
    ["", "", "Наименование", "Артикул", "Бренд", "Цена", "Строка 1С", "Запрошенный артикул"],
    ...matches.map((item) => [
      "",
      "",
      item.name,
      item.sku,
      item.brand,
      item.price,
      item.rowNumber,
      item.requestedSku,
    ]),
  ];

  const missingRows = [
    ["Артикул", "Нормализованный артикул"],
    ...missing.map((sku) => [sku, normSku(sku)]),
  ];

  const wb = XLSX.utils.book_new();
  const importSheet = XLSX.utils.aoa_to_sheet(importRows);
  importSheet["!cols"] = [
    { wch: 4 },
    { wch: 4 },
    { wch: 70 },
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 24 },
  ];
  importSheet["!autofilter"] = { ref: `A1:H${importRows.length}` };

  const missingSheet = XLSX.utils.aoa_to_sheet(missingRows);
  missingSheet["!cols"] = [{ wch: 24 }, { wch: 28 }];

  XLSX.utils.book_append_sheet(wb, importSheet, "Товары");
  XLSX.utils.book_append_sheet(wb, missingSheet, "Не найдено");
  return wb;
}

function main() {
  const stockPath = arg("--stock");
  const skusPath = arg("--skus");
  const outPath = arg("--out", path.resolve(process.cwd(), "prepared-import.xlsx"));

  if (!stockPath || !skusPath) {
    console.error("Usage: node scripts/prepare-import-from-stock-xlsx.mjs --stock остатки.xlsx --skus articles.txt --out import.xlsx");
    process.exit(2);
  }
  if (!fs.existsSync(stockPath)) {
    console.error(`Не найден файл остатков: ${stockPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(skusPath)) {
    console.error(`Не найден файл артикулов: ${skusPath}`);
    process.exit(1);
  }

  const requested = readSkuList(skusPath);
  const stock = loadStockRows(stockPath);
  const matches = [];
  const missing = [];
  const duplicateMatches = [];

  for (const requestedSku of requested) {
    const rows = stock.get(normSku(requestedSku)) ?? [];
    if (rows.length === 0) {
      missing.push(requestedSku);
      continue;
    }
    if (rows.length > 1) duplicateMatches.push({ requestedSku, count: rows.length });
    matches.push({ ...rows[0], requestedSku });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  XLSX.writeFile(makeWorkbook(matches, missing), outPath);

  console.log(`Запрошено: ${requested.length}`);
  console.log(`Найдено: ${matches.length}`);
  console.log(`Не найдено: ${missing.length}`);
  if (duplicateMatches.length > 0) {
    console.log(`Есть дубли в остатках: ${duplicateMatches.length}. Взята первая строка.`);
  }
  console.log(`Файл: ${outPath}`);
}

main();
