#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import XLSX from "xlsx";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DEFAULT_DB = path.join(ROOT, "data", "shop.db");

const GM_TOP_SECTIONS = new Set([
  "BUICK",
  "CADILLAC",
  "CHEVROLET",
  "DAEWOO",
  "GM",
  "GM USA",
  "OPEL",
  "OPEL-1",
]);

const NON_GM_TOP_SECTIONS = new Set([
  "CHERY",
  "FIAT",
  "FORD",
  "GEELY",
  "HYUNDAI/KIA",
  "LAND ROVER",
  "MERCEDES",
  "NISSAN",
  "PEUGEOT/CITROEN",
  "RENAULT",
  "VAG",
  "VOLVO",
  "БМВ",
  "ДРУГИЕ МАРКИ",
]);

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1] ?? "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normSku(value) {
  return String(value ?? "")
    .replace(/[\s\-_.\/\\,:\u00a0]+/g, "")
    .toUpperCase();
}

function normSection(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function asPrice(value) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sectionKind(section) {
  const key = normSection(section);
  if (GM_TOP_SECTIONS.has(key)) return "gm";
  if (NON_GM_TOP_SECTIONS.has(key)) return "non-gm";
  return "";
}

function loadStockMap(stockPath) {
  const wb = XLSX.readFile(stockPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const bySku = new Map();
  let currentTopSection = "";
  let currentSubSection = "";

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const name = String(row[0] ?? "").trim();
    const sku = String(row[5] ?? "").trim();
    const brand = String(row[6] ?? "").trim();
    const price = asPrice(row[7]);
    if (!name) continue;

    if (!sku) {
      const topKind = sectionKind(name);
      if (topKind) {
        currentTopSection = normSection(name);
        currentSubSection = "";
      } else if (currentTopSection && name !== "Итого") {
        currentSubSection = name;
      }
      continue;
    }

    const key = normSku(sku);
    if (!key) continue;
    if (!bySku.has(key)) bySku.set(key, []);
    bySku.get(key).push({
      rowNumber: i + 1,
      sku,
      brand,
      price,
      topSection: currentTopSection,
      subSection: currentSubSection,
      kind: sectionKind(currentTopSection),
    });
  }

  return bySku;
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeReport(reportPath, rows) {
  const header = [
    "action",
    "id",
    "sku",
    "brand",
    "name",
    "hidden",
    "stockKind",
    "topSection",
    "subSection",
    "stockRow",
    "stockSku",
    "stockBrand",
    "stockPrice",
    "matchesCount",
  ];
  const lines = [
    header.join(";"),
    ...rows.map((row) => header.map((key) => csvEscape(row[key])).join(";")),
  ];
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
}

function main() {
  const dbPath = arg("--db", DEFAULT_DB);
  const stockPath = arg("--stock");
  const reportPath = arg("--report", path.join(ROOT, "data", "non-gm-audit.csv"));
  const apply = hasFlag("--apply");

  if (!stockPath) {
    console.error("Usage: node scripts/audit-non-gm-products.mjs --stock остатки.xlsx [--db data/shop.db] [--report out.csv] [--apply]");
    process.exit(2);
  }
  if (!fs.existsSync(dbPath)) {
    console.error(`Не найдена БД: ${dbPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(stockPath)) {
    console.error(`Не найден Excel остатков: ${stockPath}`);
    process.exit(1);
  }

  const stock = loadStockMap(stockPath);
  const db = new Database(dbPath, apply ? { fileMustExist: true } : { readonly: true, fileMustExist: true });
  const products = db
    .prepare("SELECT id, sku, brand, name, hidden FROM products ORDER BY id")
    .all();

  const rows = [];
  const toHide = [];
  const toUnhide = [];
  const notFound = [];
  const duplicate = [];

  for (const product of products) {
    const matches = stock.get(normSku(product.sku)) ?? [];
    const match = matches[0];
    let action = "keep";

    if (matches.length === 0) {
      action = "not-found";
      notFound.push(product);
    } else if (matches.length > 1) {
      duplicate.push({ product, matches });
    }

    if (match?.kind === "non-gm" && Number(product.hidden) === 0) {
      action = "hide";
      toHide.push(product);
    } else if (match?.kind === "gm") {
      action = Number(product.hidden) === 0 ? "keep-gm" : "hidden-gm";
      if (Number(product.hidden) === 1) {
        action = "unhide-gm";
        toUnhide.push(product);
      }
    } else if (match?.kind === "non-gm") {
      action = "already-hidden-non-gm";
    }

    rows.push({
      action,
      id: product.id,
      sku: product.sku,
      brand: product.brand,
      name: product.name,
      hidden: product.hidden,
      stockKind: match?.kind ?? "",
      topSection: match?.topSection ?? "",
      subSection: match?.subSection ?? "",
      stockRow: match?.rowNumber ?? "",
      stockSku: match?.sku ?? "",
      stockBrand: match?.brand ?? "",
      stockPrice: match?.price ?? "",
      matchesCount: matches.length,
    });
  }

  writeReport(reportPath, rows);

  if (apply && toHide.length > 0) {
    const now = new Date().toISOString();
    const update = db.prepare("UPDATE products SET hidden = 1, updated_at = ? WHERE id = ?");
    const tx = db.transaction((items) => {
      for (const item of items) update.run(now, item.id);
    });
    tx(toHide);
  }

  if (apply && toUnhide.length > 0) {
    const now = new Date().toISOString();
    const update = db.prepare("UPDATE products SET hidden = 0, updated_at = ? WHERE id = ?");
    const tx = db.transaction((items) => {
      for (const item of items) update.run(now, item.id);
    });
    tx(toUnhide);
  }

  db.close();

  const byAction = rows.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] ?? 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    dbPath,
    stockPath,
    reportPath,
    apply,
    totalProducts: products.length,
    toHide: toHide.length,
    toUnhide: toUnhide.length,
    notFound: notFound.length,
    duplicateSkusInStock: duplicate.length,
    byAction,
    sampleToHide: rows.filter((row) => row.action === "hide").slice(0, 30),
    sampleToUnhide: rows.filter((row) => row.action === "unhide-gm").slice(0, 30),
    sampleNotFound: rows.filter((row) => row.action === "not-found").slice(0, 20),
  }, null, 2));
}

main();
