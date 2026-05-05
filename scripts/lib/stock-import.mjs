import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const GM_SECTION_MARKERS = [
  "gm",
  "gmusa",
  "generalmotors",
  "opel",
  "opel1",
  "chevrolet",
  "daewoo",
  "cadillac",
  "buick",
];

const NON_GM_SECTION_MARKERS = [
  "hyundai", "kia", "toyota", "lexus", "nissan", "infiniti",
  "renault", "mercedes", "bmw", "mini", "ford", "audi",
  "skoda", "seat", "volkswagen", "vw", "vag", "porsche",
  "mazda", "subaru", "honda", "mitsubishi", "peugeot",
  "citroen", "dacia", "suzuki", "volvo", "fiat",
  "jeep", "chrysler", "lada", "ваз", "uaz", "уаз", "niva",
  "нива", "chery", "landrover", "haval", "бмв", "другиемарки",
];

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

function normSection(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "");
}

function detectStockSection(label) {
  const key = normSection(label);
  if (!key) return null;
  if (GM_SECTION_MARKERS.some((marker) => key === marker || key.includes(marker))) {
    return { kind: "gm", label: String(label).trim() };
  }
  if (NON_GM_SECTION_MARKERS.some((marker) => key === marker || key.includes(marker))) {
    return { kind: "non-gm", label: String(label).trim() };
  }
  return null;
}

export function loadStockRows(stockPath) {
  const wb = XLSX.readFile(stockPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const bySku = new Map();
  let currentSection = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[0] ?? "").trim();
    const sku = String(row[5] ?? "").trim();
    const brand = String(row[6] ?? "").trim();
    const price = asPrice(row[7]);
    if (!sku) {
      const section = detectStockSection(name);
      if (section) currentSection = section;
    }
    if (!name || !sku || price <= 0) continue;

    const key = normSku(sku);
    if (!key) continue;
    if (!bySku.has(key)) bySku.set(key, []);
    bySku.get(key).push({
      rowNumber: i + 1,
      name,
      sku,
      brand,
      price,
      stockSection: currentSection?.label ?? "",
      stockSectionKind: currentSection?.kind ?? "",
    });
  }

  return bySku;
}

export function buildImportWorkbook(requested, stockPath) {
  const stock = loadStockRows(stockPath);
  const matches = [];
  const missing = [];
  const duplicateMatches = [];
  const nonGmMatches = [];
  const importMatches = [];

  for (const requestedSku of requested) {
    const rows = stock.get(normSku(requestedSku)) ?? [];
    if (rows.length === 0) {
      missing.push(requestedSku);
      continue;
    }
    if (rows.length > 1) duplicateMatches.push({ requestedSku, count: rows.length });
    const match = { ...rows[0], requestedSku };
    matches.push(match);
    if (match.stockSectionKind === "non-gm") {
      nonGmMatches.push(match);
    } else {
      importMatches.push(match);
    }
  }

  return {
    workbook: makeWorkbook(importMatches, missing),
    matches: importMatches,
    allMatches: matches,
    missing,
    duplicateMatches,
    nonGmMatches,
  };
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
