/**
 * Автоматическая SEO-обработка названия товара из 1С.
 *
 * Что делает:
 *  1. Добавляет марку авто перед моделью (Astra → Opel Astra, Cruze → Chevrolet Cruze)
 *  2. Добавляет «| арт. SKU» в конце
 *  3. Нормализует регистр (CHEVROLET → Chevrolet)
 *  4. Убирает лишние пробелы
 *
 * Техническую часть (коды моторов, бренды деталей) НЕ трогает.
 */

const OPEL_MODELS = new Set([
  "Astra", "Corsa", "Zafira", "Insignia", "Mokka", "Meriva",
  "Vectra", "Speedster", "Agila", "Tigra", "Signum", "Combo",
]);

const CHEVY_MODELS = new Set([
  "Cruze", "Aveo", "Cobalt", "Orlando", "Lacetti", "Captiva",
  "Spark", "Malibu", "Volt", "Trax", "Epica",
]);

const DAEWOO_MODELS = new Set([
  "Nexia", "Lanos", "Matiz", "Espero", "Nubira",
]);

function brandFor(model: string): string | null {
  const base = model.split(/[-\s]/)[0];
  if (OPEL_MODELS.has(base)) return "Opel";
  if (CHEVY_MODELS.has(base)) return "Chevrolet";
  if (DAEWOO_MODELS.has(base)) return "Daewoo";
  return null;
}

function addBrandToSegment(seg: string): string {
  const s = seg.trim();
  if (!s) return s;
  if (/^(Opel|Chevrolet|Daewoo|Honda|Acura|VAG|PSA|OPEL|CHEVROLET)\b/.test(s)) {
    return s.replace("CHEVROLET", "Chevrolet").replace("OPEL", "Opel");
  }
  const b = brandFor(s);
  return b ? `${b} ${s}` : s;
}

/** Основная функция SEO-обработки названия. */
export function seoProductName(rawName: string, sku: string): string {
  let n = rawName.trim().replace(/  +/g, " ");

  // Обработка слэш-списков моделей: "Aveo T300/Astra-J/Cruze" → "Chevrolet Aveo T300 / Opel Astra-J / Chevrolet Cruze"
  const allModels = [...OPEL_MODELS, ...CHEVY_MODELS, ...DAEWOO_MODELS].join("|");
  const slashRe = new RegExp(
    `(?:(?:(?:Opel |Chevrolet |Daewoo |OPEL |CHEVROLET )?(?:${allModels})[\\w\\s-]*)(?:\\/(?:(?:Opel |Chevrolet |Daewoo )?(?:${allModels})[\\w\\s-]*))+)`,
    "g",
  );
  n = n.replace(slashRe, (match) =>
    match
      .split("/")
      .map((p) => addBrandToSegment(p))
      .join(" / "),
  );

  // Отдельные модели (не в слэшах)
  for (const model of [...OPEL_MODELS, ...CHEVY_MODELS, ...DAEWOO_MODELS]) {
    const b = brandFor(model);
    if (!b) continue;
    const re = new RegExp(`(?<!\\b${b} )(?<!\\w/)\\b(${model}(?:[ -][A-Z0-9])?)`, "g");
    n = n.replace(re, `${b} $1`);
    // Убираем двойные
    n = n.replace(new RegExp(`\\b${b} ${b}\\b`, "g"), b);
  }

  // Нормализация регистра
  n = n
    .replace(/\bCHEVROLET\b/g, "Chevrolet")
    .replace(/\bOPEL\b/g, "Opel")
    .replace(/\bASTRA\b/g, "Astra")
    .replace(/\bCRUZE\b/g, "Cruze");

  // Артикул в конце
  if (!n.includes(sku)) {
    n = `${n} | арт. ${sku}`;
  }

  return n.replace(/  +/g, " ").trim();
}
