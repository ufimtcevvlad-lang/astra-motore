/**
 * Нормализация названий брендов: единый регистр, мёрдж дубликатов.
 * Запуск: npx tsx scripts/normalize-brands.ts
 */
import { db, schema } from "../src/app/lib/db";
import { eq } from "drizzle-orm";

const BRAND_MAP: Record<string, string> = {
  // GM family → единый GM
  "GENERAL MOTORS": "GM",
  "General Motors": "GM",
  "GM OE": "GM",
  // Case normalization (uppercase → Title Case)
  BOSCH: "Bosch",
  PATRON: "Patron",
  GATES: "Gates",
  DELPHI: "Delphi",
  DELLO: "Dello",
  LYNX: "Lynx",
  "BIG FILTER": "Big Filter",
  FILTRON: "Filtron",
  STELLOX: "Stellox",
  AIRTEX: "Airtex",
  SANGSIN: "Sangsin",
  SANGSIN_BRAKE: "Sangsin",
  MILES: "Miles",
  TESLA: "Tesla",
  "JP GROUP": "JP Group",
  DOLZ: "Dolz",
  CARGEN: "Cargen",
  VERNET: "Vernet",
  UXCLENT: "Uxclent",
  "PSA OE": "PSA",
  // Uppercase acronyms остаются
  NGK: "NGK",
  TRW: "TRW",
  INA: "INA",
  HSB: "HSB",
  ERA: "ERA",
  UFI: "UFI",
  VIKA: "VIKA",
  KS: "KS",
  ICER: "ICER",
};

const rows = db.select().from(schema.products).all();
let updated = 0;
const distinct = new Map<string, number>();
for (const r of rows) {
  const canonical = BRAND_MAP[r.brand] ?? r.brand;
  distinct.set(canonical, (distinct.get(canonical) ?? 0) + 1);
  if (canonical !== r.brand) {
    db.update(schema.products).set({ brand: canonical, updatedAt: new Date().toISOString() })
      .where(eq(schema.products.id, r.id)).run();
    updated += 1;
  }
}
console.log(`Updated ${updated} of ${rows.length} products`);
console.log("Distinct brands after normalization:");
for (const [b, n] of [...distinct.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${b || "(empty)"}: ${n}`);
}
