/**
 * Выгрузка каталога из БД в Excel.
 * Колонки: наименование, артикул, цена (как на сайте).
 *
 * Запуск: npm run catalog:export-xlsx
 * Путь к файлу: exports/catalog-export-<дата>.xlsx (или первый аргумент CLI).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { getAllProducts } from "../src/app/lib/products-db";

const products = getAllProducts();

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timestampForFilename(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

const outArg = process.argv[2];
const defaultDir = path.join(process.cwd(), "exports");
const outFile =
  outArg ??
  path.join(defaultDir, `catalog-export-${timestampForFilename(new Date())}.xlsx`);

const rows = products.map((p) => ({
  Наименование: p.name,
  Артикул: p.sku,
  "Цена, ₽": p.price,
}));

const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet["!cols"] = [{ wch: 56 }, { wch: 16 }, { wch: 12 }];
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Товары");

const dir = path.dirname(outFile);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

XLSX.writeFile(workbook, outFile);
console.log(`Записано строк: ${rows.length}`);
console.log(outFile);
