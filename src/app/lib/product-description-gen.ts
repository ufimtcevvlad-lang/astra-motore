import type { Product } from "../data/products";

const CATEGORY_PHRASE_MAP: Record<string, string> = {
  "Масляные фильтры": "фильтрующий элемент",
  "Воздушные фильтры": "фильтрующий элемент",
  "Салонные фильтры": "фильтрующий элемент",
  "Топливные фильтры": "фильтрующий элемент",
  "Фильтры АКПП": "фильтрующий элемент",
  "ТО и расходники": "расходник",
  "Двигатель и смазка": "деталь двигателя",
  "Двигатель": "деталь двигателя",
  "Охлаждение": "элемент системы охлаждения",
  "Прокладки и уплотнения": "уплотнительный элемент",
  "Прокладки, сальники и кольца": "уплотнительный элемент",
  "Подвеска": "элемент подвески",
  "Тормозная система": "тормозной компонент",
  "Свет и электрика": "электрокомпонент",
  "Автосвет и электрика": "электрокомпонент",
  "Свечи и зажигание": "элемент системы зажигания",
  "Кузов и крепёж": "кузовной элемент",
};

const GENERIC_PHRASES = [
  "запчасть",
  "автокомпонент",
  "деталь",
  "комплектующая",
  "расходник",
];

const CLOSING_PHRASES = [
  "В наличии, отправка из Екатеринбурга.",
  "Склад Екатеринбург, доставка по РФ.",
  "Есть на складе, быстрая отправка.",
  "В наличии в Екатеринбурге, отправим по РФ.",
  "На складе, доставка по России.",
  "Готов к отправке из Екатеринбурга.",
];

function hashIndex(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return ((h % len) + len) % len;
}

export function generateProductDescription(product: Product): string {
  const typPhrase =
    CATEGORY_PHRASE_MAP[product.category] ??
    GENERIC_PHRASES[hashIndex(product.id, GENERIC_PHRASES.length)];

  const closing = CLOSING_PHRASES[hashIndex(product.id + "close", CLOSING_PHRASES.length)];

  const parts: string[] = [];

  if (product.brand) {
    parts.push(`${product.name} (${product.brand}) — ${typPhrase}`);
  } else {
    parts.push(`${product.name} — ${typPhrase}`);
  }

  if (product.car) {
    parts[0] += ` для ${product.car}`;
  }
  parts[0] += ".";

  parts.push(`Артикул ${product.sku}.`);
  parts.push(closing);

  return parts.join(" ");
}

export function generateProductMetaDescription(product: Product): string {
  const parts: string[] = [];

  if (product.brand) {
    parts.push(`${product.brand} ${product.sku} — ${product.name}`);
  } else {
    parts.push(`${product.sku} — ${product.name}`);
  }

  if (product.car) {
    parts[0] += ` для ${product.car}`;
  }
  parts[0] += ".";

  parts.push(`Арт. ${product.sku}, в наличии в Екатеринбурге.`);
  parts.push("Доставка по РФ. Гарантия. GM Shop 66.");

  const full = parts.join(" ");
  if (full.length <= 158) return full;

  const slice = full.slice(0, 157);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 72 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…";
}

export function generateProductTitle(product: Product): string {
  return `${product.name} | GM Shop 66`;
}

export function generateProductKeywords(product: Product): string[] {
  const kw: string[] = [product.sku];
  if (product.brand) kw.push(product.brand);
  let cleanName = product.name.replace(product.sku, "");
  if (product.brand) cleanName = cleanName.replace(product.brand, "");
  cleanName = cleanName.replace(/\s+/g, " ").trim();
  if (cleanName) kw.push(cleanName);
  if (product.car) kw.push(product.car);
  kw.push("автозапчасти Екатеринбург");
  return kw;
}
