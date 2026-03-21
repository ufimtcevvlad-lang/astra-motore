#!/usr/bin/env node
/**
 * Читает Excel «топ продаж Opel» и печатает фрагмент для сверки (первые N строк).
 * Путь к файлу: аргумент или ~/Desktop/топ 100 продаж опель.xlsx
 *
 *   node scripts/opel-excel-to-ts.mjs "/path/to/file.xlsx" 10
 */
import XLSX from "xlsx";
import path from "node:path";
import os from "node:os";

function roundRetailRubles(raw) {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 500) return Math.ceil(raw / 50) * 50;
  return Math.ceil(raw / 100) * 100;
}

const fileArg =
  process.argv[2] ||
  path.join(os.homedir(), "Desktop", "топ 100 продаж опель.xlsx");
const limit = Math.max(1, parseInt(process.argv[3] || "10", 10));

const wb = XLSX.readFile(fileArg);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

console.log("File:", fileArg);
console.log("Sheet:", wb.SheetNames[0]);
console.log("---");

for (let i = 1; i <= limit && i < rows.length; i++) {
  const r = rows[i];
  const name = r[0];
  const sku = String(r[1]);
  const qty = Number(r[2]);
  const priceRaw = Number(r[3]);
  console.log(
    i,
    "| sku:",
    sku,
    "| raw ₽:",
    priceRaw,
    "| rounded:",
    roundRetailRubles(priceRaw),
    "| qty:",
    qty,
    "|",
    String(name).slice(0, 60) + (String(name).length > 60 ? "…" : "")
  );
}
