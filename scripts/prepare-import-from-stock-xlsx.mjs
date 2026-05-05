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
import { parseSkuList, writeImportWorkbook } from "./lib/stock-import.mjs";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? "";
}

function readSkuList(filePath) {
  return parseSkuList(fs.readFileSync(filePath, "utf8"));
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
  const { matches, missing, duplicateMatches, nonGmMatches } = writeImportWorkbook({ requested, stockPath, outPath });

  console.log(`Запрошено: ${requested.length}`);
  console.log(`Найдено для GM-импорта: ${matches.length}`);
  console.log(`Не-GM исключено из импорта: ${nonGmMatches.length}`);
  console.log(`Не найдено: ${missing.length}`);
  if (duplicateMatches.length > 0) {
    console.log(`Есть дубли в остатках: ${duplicateMatches.length}. Взята первая строка.`);
  }
  console.log(`Файл: ${outPath}`);
}

main();
