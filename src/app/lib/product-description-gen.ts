import type { Product } from "./products-types";

const CATEGORY_PHRASE_MAP: Record<string, string> = {
  "Воздушные фильтры": "воздушный фильтр",
  "Салонные фильтры": "салонный фильтр",
  "Масляные фильтры": "масляный фильтр",
  "Топливные фильтры": "топливный фильтр",
  "Фильтры АКПП": "фильтр АКПП",
  "Свечи зажигания": "свеча зажигания",
  "Щётки стеклоочистителя": "щётка стеклоочистителя",
  "Лампы": "лампа",
  "Поликлиновые ремни": "поликлиновый ремень",
  "Ремни генератора": "ремень генератора",
  "Ролики и натяжители": "ролик-натяжитель",
  "Тормозные колодки": "тормозные колодки",
  "Тормозные диски": "тормозной диск",
  "Тормозные шланги": "тормозной шланг",
  "Суппорты и ремкомплекты": "элемент тормозного суппорта",
  "Трос ручника": "трос ручного тормоза",
  "Амортизаторы": "амортизатор",
  "Стабилизатор": "элемент стабилизатора",
  "Шаровые опоры": "шаровая опора",
  "Рулевые тяги и наконечники": "рулевой элемент",
  "Рычаги": "рычаг подвески",
  "Сайлентблоки": "сайлентблок",
  "Пружины": "пружина подвески",
  "Пыльники": "пыльник",
  "Ступицы и подшипники": "ступичный элемент",
  "ШРУС": "ШРУС",
  "Опоры двигателя": "опора двигателя",
  "Радиаторы": "радиатор",
  "Помпы": "водяная помпа",
  "Термостаты": "термостат",
  "Бачки расширительные": "расширительный бачок",
  "Патрубки и шланги": "патрубок системы охлаждения",
  "Мотор отопителя": "мотор отопителя салона",
  "Катушки зажигания": "катушка зажигания",
  "Модули зажигания": "модуль зажигания",
  "Высоковольтные провода": "комплект высоковольтных проводов",
  "Прокладки ДВС": "прокладка двигателя",
  "Уплотнительные кольца": "уплотнительное кольцо",
  "Сальники": "сальник",
  "Поршневая группа": "деталь поршневой группы",
  "Сцепление": "элемент сцепления",
  "Цилиндры сцепления": "цилиндр сцепления",
  "Насосы топливные": "топливный насос",
  "Клапаны ДВС": "клапан двигателя",
  "Маховики": "маховик",
  "Датчики": "датчик",
  "Генераторы и стартеры": "элемент электропривода",
  "Аккумуляторы": "аккумулятор",
  "Тюнинг и прошивки": "компонент чип-тюнинга",
  "Предохранители": "предохранитель",
  "Глушители и гофры": "элемент выхлопной системы",
  "Бамперы и накладки": "кузовной элемент бампера",
  "Подкрылки": "подкрылок",
  "Стёкла зеркал": "стекло зеркала",
  "Решётки и молдинги": "декоративный кузовной элемент",
  "Головки и биты": "инструмент: головка/бита",
  "Ключи": "ключ",
  "Вставки резьбовые": "резьбовая вставка",
  "Компрессоры кондиционера": "компрессор кондиционера",
  "Клапаны и фитинги A/C": "элемент системы кондиционирования",
  "Болты": "болт",
  "Гайки": "гайка",
  "Клипсы и пистоны": "кузовной крепёж",
  "Насосы стеклоомывателя": "насос стеклоомывателя",
  "Форсунки омывателя": "форсунка омывателя",
  "Бачки омывателя": "бачок омывателя",
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
  "Доступен к заказу из Екатеринбурга.",
  "Отправка со склада в Екатеринбурге — по всей России.",
  "В наличии на складе, отгрузка в день заказа.",
  "Екатеринбургский склад, быстрая доставка.",
  "Готов к отгрузке, склад в Екатеринбурге.",
  "Под заказ не нужно — есть в наличии.",
  "Товар на складе, отправка по России без задержек.",
  "Склад Екатеринбурга — отправим транспортной.",
  "В наличии, возможна отправка почтой и ТК.",
];

function hashIndex(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return ((h % len) + len) % len;
}

function stripSkuFromName(name: string, sku: string): string {
  const escapedSku = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const artPattern = new RegExp(
    String.raw`(?:\s*[|,;—-]\s*)?(?:арт\.?|артикул)\s*[:№#-]?\s*${escapedSku}`,
    "gi",
  );
  return name
    .replace(artPattern, "")
    .replace(/\s+\|+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function displayName(product: Product): string {
  return stripSkuFromName(product.name, product.sku) || product.name;
}

export function generateProductDescription(product: Product): string {
  const name = displayName(product);
  const typPhrase =
    CATEGORY_PHRASE_MAP[product.category] ??
    GENERIC_PHRASES[hashIndex(product.id, GENERIC_PHRASES.length)];

  const closing = CLOSING_PHRASES[hashIndex(product.id + "close", CLOSING_PHRASES.length)];

  const parts: string[] = [];

  if (product.brand) {
    parts.push(`${name} (${product.brand}) — ${typPhrase}`);
  } else {
    parts.push(`${name} — ${typPhrase}`);
  }

  if (product.car) {
    parts[0] += ` для ${product.car}`;
  }
  parts[0] += ".";

  parts.push(closing);

  return parts.join(" ");
}

export function generateProductMetaDescription(product: Product): string {
  const name = displayName(product);
  const parts: string[] = [];

  if (product.brand) {
    parts.push(`${product.brand} ${product.sku} — ${name}`);
  } else {
    parts.push(`${product.sku} — ${name}`);
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
  return `${displayName(product)} | GM Shop 66`;
}

export function generateProductKeywords(product: Product): string[] {
  const kw: string[] = [product.sku];
  if (product.brand) kw.push(product.brand);
  let cleanName = displayName(product).replace(product.sku, "");
  if (product.brand) cleanName = cleanName.replace(product.brand, "");
  cleanName = cleanName.replace(/\s+/g, " ").trim();
  if (cleanName) kw.push(cleanName);
  if (product.car) kw.push(product.car);
  kw.push("автозапчасти Екатеринбург");
  return kw;
}
