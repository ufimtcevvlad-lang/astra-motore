import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

export function normSku(value) {
  return String(value ?? "")
    .replace(/[\s\-_.\/\\]+/g, "")
    .toUpperCase();
}

export function parseSkuList(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asPrice(value) {
  if (typeof value === "number") return Math.round(value);
  const parsed = Number(String(value ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function loadStockRows(stockPath) {
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
    if (!bySku.has(key)) bySku.set(key, []);
    bySku.get(key).push({ rowNumber: i + 1, name, sku, brand, price });
  }

  return bySku;
}

export function buildImportWorkbook(requested, stockPath) {
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

  return { workbook: makeWorkbook(matches, missing), matches, missing, duplicateMatches };
}

export function makeWorkbook(matches, missing) {
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

export function writeImportWorkbook({ requested, stockPath, outPath }) {
  const result = buildImportWorkbook(requested, stockPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  XLSX.writeFile(result.workbook, outPath);
  return result;
}
