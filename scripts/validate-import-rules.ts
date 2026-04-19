/**
 * Прогон логики импорта по реальному прайсу ~/Desktop/artikuly.xlsx
 * (лист «Лист1»). Вывод статистики покрытия.
 *
 * Запуск: npx tsx scripts/validate-import-rules.ts <path-to-xlsx>
 */
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { classify } from "../src/app/lib/import/classify";
import { rewriteName } from "../src/app/lib/import/rewrite-name";
import { detectCategory } from "../src/app/lib/import/detect-category";

const path = process.argv[2] ?? `${process.env.HOME}/Desktop/artikuly.xlsx`;
const wb = XLSX.read(readFileSync(path));
const sheetName = wb.SheetNames.includes("Лист1") ? "Лист1" : wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
  header: "A",
});

let total = 0, rejected = 0, categorized = 0, uncategorized = 0, unresolvedCar = 0;
const unmatched: Record<string, { count: number; example: string }> = {};

for (const row of rows) {
  // Определяем колонки: если это «Лист1» — A=sku, B=name, C=brand.
  // Если «Артикулы» — C=name, D=sku, E=brand.
  const name = String(row["B"] ?? row["C"] ?? "").trim();
  const sku = String(row["A"] ?? row["D"] ?? "").trim();
  const brand = String(row["C"] ?? row["E"] ?? "").trim();
  if (!name || !sku) continue;
  total++;
  const reject = classify(name, brand);
  if (reject) { rejected++; continue; }
  const rewrite = rewriteName(name, sku);
  if (rewrite.unresolved) unresolvedCar++;
  const section = detectCategory(name);
  if (section) categorized++;
  else {
    uncategorized++;
    const firstTwo = name.match(/([А-ЯЁа-яё][А-ЯЁа-яё-]+)(\s+[а-яё][а-яё-]+)?/)?.[0] ?? "?";
    const key = firstTwo.toLowerCase();
    if (!unmatched[key]) unmatched[key] = { count: 0, example: name };
    unmatched[key].count++;
  }
}

const effective = total - rejected;
console.log(`Total rows: ${total}`);
console.log(`Rejected (non-GM/chemistry): ${rejected} (${pct(rejected, total)})`);
console.log(`Effective GM positions: ${effective}`);
console.log(`Categorized: ${categorized} (${pct(categorized, effective)})`);
console.log(`Uncategorized: ${uncategorized} (${pct(uncategorized, effective)})`);
console.log(`Unresolved car (no model match): ${unresolvedCar} (${pct(unresolvedCar, effective)})`);
console.log(`\nTop 20 uncategorized types:`);
const top = Object.entries(unmatched).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
for (const [k, v] of top) console.log(`  ${v.count.toString().padStart(4)}  ${k.padEnd(30)} | ${v.example.slice(0, 80)}`);

function pct(n: number, d: number): string {
  return d === 0 ? "0%" : `${(n * 100 / d).toFixed(1)}%`;
}
