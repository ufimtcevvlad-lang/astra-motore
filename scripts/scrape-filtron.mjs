#!/usr/bin/env node
/**
 * Парсер характеристик запчастей с сайтов производителей.
 *
 * Источники:
 *  - filtron.eu — масляные фильтры Filtron (2 товара)
 *  - delphiautoparts.com — модули зажигания и тяга стабилизатора Delphi (3 товара)
 *
 * Берём ТОЛЬКО технические характеристики (размеры, резьба, материал, напряжение).
 * Это факты, которые не охраняются авторским правом (ст. 1259 ГК РФ).
 *
 * Соблюдаем:
 *  - robots.txt обоих сайтов (публичный каталог разрешён)
 *  - честный User-Agent с контактным URL
 *  - задержка 3 сек между запросами
 *  - парсим только 5 наших SKU, не массово
 *
 * Использование:
 *   node scripts/scrape-filtron.mjs
 */

import * as cheerio from "cheerio";

const USER_AGENT =
  "GmShop66-SpecsBot/1.0 (+https://gmshop66.ru/contacts; only technical specs, respecting robots.txt)";

// ------------------ Filtron ------------------

/** Подписи для стандартных буквенных обозначений размеров масляных фильтров Filtron. */
const FILTRON_LABEL_MAP = {
  A: "Внешний диаметр",
  B: "Диаметр уплотнения",
  C: "Внутренний диаметр",
  D: "Диаметр отверстия",
  G: "Резьба",
  H: "Высота",
};

async function fetchFiltronProduct(sku) {
  const slug = sku.toLowerCase().replace(/[\s-]/g, "");
  const url = `https://filtron.eu/ru/catalog/search-results/product.html/${slug}_filtron.html`;

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "ru,en;q=0.5" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} для ${url}`);
  return await response.text();
}

function extractFiltronSpecs(html) {
  const $ = cheerio.load(html);

  const dimItem = $("h3")
    .filter((_, el) => $(el).text().trim() === "Размеры")
    .first()
    .closest(".cmp-accordion__item");

  if (dimItem.length === 0) return [];

  const text = dimItem.text().replace(/\s+/g, " ").trim();

  // Пары: буква + значение (число с единицей ИЛИ резьба M__x__)
  const pairPattern = /\b([A-Z])\s+(M?\d[\d.,]*(?:x\d[\d.,]*)?(?:-\d+[A-Z]?)?(?:\s*mm)?)/g;

  const specs = [];
  for (const pairMatch of text.matchAll(pairPattern)) {
    const letter = pairMatch[1];
    let value = pairMatch[2].trim();

    // Резьба (начинается с M + цифры + "x") — убираем суффикс "mm", это не миллиметры
    if (/^M\d+x/.test(value)) {
      value = value.replace(/\s*mm\b/, "").trim();
    } else {
      value = value.replace(/\s*mm\b/, " мм").trim();
    }

    const label = FILTRON_LABEL_MAP[letter] || letter;
    if (!specs.some((s) => s.label === label)) {
      specs.push({ label, value });
    }
  }

  return specs;
}

// ------------------ Delphi ------------------

/** Перевод подписей характеристик Delphi с англ. на русский. */
const DELPHI_LABEL_MAP = {
  "Height [mm]": "Высота",
  "Length [mm]": "Длина",
  "Width [mm]": "Ширина",
  "Material": "Материал",
  "Rod/Strut": "Тип",
  "Thread Size 1": "Резьба 1",
  "Thread Size 2": "Резьба 2",
  "Colour": "Цвет",
  "Number of pins": "Контактов",
  "Resistor [Ohm]": "Сопротивление",
  "Voltage [V]": "Напряжение",
};

/** Перевод типовых значений Delphi. */
const DELPHI_VALUE_MAP = {
  "black": "чёрный",
  "white": "белый",
  "Plastic": "пластик",
  "Steel": "сталь",
  "Aluminium": "алюминий",
  "Coupling Rod": "тяга стабилизатора",
};

async function fetchDelphiProduct(sku) {
  const url = `https://www.delphiautoparts.com/en-gb/catalogue/part/${sku}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en;q=0.9,ru;q=0.5" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} для ${url}`);
  return await response.text();
}

function extractDelphiSpecs(html) {
  const $ = cheerio.load(html);
  const block = $(".dp-part__info-attributes");
  if (block.length === 0) return [];

  // Формат: "Product Attributes Height [mm]: 68 mm Length [mm]: 304 mm Material: Plastic ..."
  const raw = block.text().replace(/\s+/g, " ").trim().replace(/^Product Attributes\s*/i, "");

  // Разбиваем по паттерну "LabelName: Value " — labels могут содержать пробелы и [],
  // значения могут содержать пробелы и цифры. Разделитель — ": ", следующий label — текст до ":".
  // Используем split по "слово: " как приближение — точнее через lookahead на ключевые слова.
  //
  // Проще — разбор "вручную": ищем известные labels.
  const labelsSorted = Object.keys(DELPHI_LABEL_MAP).sort((a, b) => b.length - a.length);

  const specs = [];
  // Регулярка: (label): (value до следующего label или конца)
  const labelAlternation = labelsSorted.map((l) => l.replace(/[[\]]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(${labelAlternation})\\s*:\\s*([^]*?)(?=\\s+(?:${labelAlternation})\\s*:|$)`, "g");

  for (const m of raw.matchAll(pattern)) {
    const labelEn = m[1].trim();
    let value = m[2].trim();

    // Нормализация значения
    value = value.replace(/\s*mm\b/g, " мм");
    value = value.replace(/\s+/g, " ").trim();
    value = DELPHI_VALUE_MAP[value] || value;
    // "6 -pin connector" → "6-контактный"
    value = value.replace(/(\d+)\s*-pin connector/, "$1-контактный");
    value = value.replace(/(\d+)\s*Ohm/, "$1 Ом");
    value = value.replace(/(\d+)\s*V$/, "$1 В");

    const label = DELPHI_LABEL_MAP[labelEn] || labelEn;
    specs.push({ label, value });
  }

  return specs;
}

// ------------------ Runner ------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const filtronTargets = [
    { id: "opel-41", sku: "OP570" },
    { id: "opel-100", sku: "OP575" },
  ];

  const delphiTargets = [
    { id: "opel-62", sku: "CE2000912B1" },
    { id: "opel-74", sku: "GN1023412B1" },
    { id: "opel-95", sku: "TC2279" },
  ];

  const results = {};

  console.error("=== Filtron ===");
  for (const target of filtronTargets) {
    try {
      console.error(`→ ${target.id} (${target.sku}) ...`);
      const html = await fetchFiltronProduct(target.sku);
      const specs = extractFiltronSpecs(html);
      console.error(`  ${specs.length > 0 ? "✓" : "⚠"} ${specs.length} параметров`);
      results[target.id] = { source: "filtron.eu", sku: target.sku, specs };
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      results[target.id] = { source: "filtron.eu", sku: target.sku, specs: [], error: err.message };
    }
    await sleep(3000);
  }

  console.error("\n=== Delphi ===");
  for (const target of delphiTargets) {
    try {
      console.error(`→ ${target.id} (${target.sku}) ...`);
      const html = await fetchDelphiProduct(target.sku);
      const specs = extractDelphiSpecs(html);
      console.error(`  ${specs.length > 0 ? "✓" : "⚠"} ${specs.length} параметров`);
      results[target.id] = { source: "delphiautoparts.com", sku: target.sku, specs };
    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      results[target.id] = {
        source: "delphiautoparts.com",
        sku: target.sku,
        specs: [],
        error: err.message,
      };
    }
    await sleep(3000);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Ошибка:", err);
  process.exit(1);
});
